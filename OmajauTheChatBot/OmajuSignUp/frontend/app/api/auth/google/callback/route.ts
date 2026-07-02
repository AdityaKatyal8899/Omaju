import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { GoogleUser, findUserAcrossCollections, findUserByProviderId } from '@/lib/models/User';
import { generateTokens } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '';

  const agentFrontendUrl = process.env.AGENT_FRONTEND_URL || 'http://localhost:3000';
  let origin = 'http://localhost:3000';
  try {
    origin = new URL(agentFrontendUrl).origin;
  } catch (e) {
    origin = agentFrontendUrl.replace(/\/auth\/callback$/, '');
  }
  const errorRedirect = (msg: string) => NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(msg)}`);

  if (!code) {
    return errorRedirect('Google authentication failed: Authorization code missing');
  }

  try {
    await connectDB();

    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/google/callback`;

    // 1. Exchange code for Google Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Google token exchange failed:', errBody);
      return errorRedirect('Google token exchange failed');
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch User Profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      console.error('Google profile fetch failed');
      return errorRedirect('Failed to fetch Google profile info');
    }

    const profile = await profileResponse.json();
    const { id, email, name, picture } = profile;

    if (!email) {
      return errorRedirect('Google account must have an email address');
    }

    // 3. Match or Create User
    let userResult = await findUserByProviderId('google', id);
    let user;

    if (userResult) {
      user = userResult.user;
    } else {
      // Check duplicate email
      const duplicateUser = await findUserAcrossCollections(email);
      if (duplicateUser) {
        return errorRedirect(`An account with email ${email} already exists.`);
      }

      // Create new Google user
      user = new GoogleUser({
        googleId: id,
        email,
        name: name || email.split('@')[0],
        avatar: picture || null,
        provider: 'google',
      });
      await user.save();
    }

    // 4. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user.email);

    // 5. Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 6. Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.warn('Welcome email failed (google callback):', err?.message || err);
    });

    // 7. Redirect to Agent Frontend
    const base = process.env.AGENT_FRONTEND_URL || 'http://localhost:3000/auth/callback';
    const nextParam = state ? `&next=${encodeURIComponent(state)}` : '';
    return NextResponse.redirect(`${base}?token=${accessToken}&refreshToken=${refreshToken}&provider=google${nextParam}`);

  } catch (error) {
    console.error('Google OAuth success error:', error);
    return errorRedirect('Authentication failed');
  }
}
