import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { GithubUser, findUserAcrossCollections, findUserByProviderId } from '@/lib/models/User';
import { generateTokens } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '';

  const agentFrontendUrl = process.env.AGENT_FRONTEND_URL || 'https://omaju-chatinterface-adityakatyal.vercel.app';
  let origin = 'https://omaju-chatinterface-adityakatyal.vercel.app';
  try {
    origin = new URL(agentFrontendUrl).origin;
  } catch (e) {
    origin = agentFrontendUrl.replace(/\/auth\/callback$/, '');
  }
  const errorRedirect = (msg: string) => NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(msg)}`);

  if (!code) {
    return errorRedirect('GitHub authentication failed: Authorization code missing');
  }

  try {
    await connectDB();

    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const callbackUrl = process.env.GITHUB_REDIRECT_URI || `${protocol}://${host}/api/auth/github/callback`;

    // 1. Exchange code for GitHub Access Token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || '',
        client_secret: process.env.GITHUB_CLIENT_SECRET || '',
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('GitHub token exchange failed:', errBody);
      return errorRedirect('GitHub token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    if (!access_token) {
      console.error('GitHub access token missing from response:', tokenData);
      return errorRedirect('GitHub access token missing');
    }

    // 2. Fetch User Profile from GitHub
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${access_token}`,
        'User-Agent': 'Omaju-Next-App',
      },
    });

    if (!profileResponse.ok) {
      console.error('GitHub profile fetch failed');
      return errorRedirect('Failed to fetch GitHub profile info');
    }

    const profile = await profileResponse.json();
    const githubId = String(profile.id);
    const name = profile.name || profile.login;
    const username = profile.login;
    const avatar = profile.avatar_url;

    // 3. Fetch User Email from GitHub
    let email = profile.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${access_token}`,
          'User-Agent': 'Omaju-Next-App',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        // Find primary email, or verified, or any
        const primaryEmailObj = emails.find((e: any) => e.primary) || emails.find((e: any) => e.verified) || emails[0];
        email = primaryEmailObj?.email;
      }
    }

    if (!email) {
      return errorRedirect('GitHub account must have a public email address');
    }

    // 4. Match or Create User
    let userResult = await findUserByProviderId('github', githubId);
    let user;

    if (userResult) {
      user = userResult.user;
    } else {
      // Check duplicate email
      const duplicateUser = await findUserAcrossCollections(email);
      if (duplicateUser) {
        return errorRedirect(`An account with email ${email} already exists.`);
      }

      // Create new GitHub user
      user = new GithubUser({
        githubId,
        email,
        name,
        username,
        avatar: avatar || null,
        provider: 'github',
      });
      await user.save();
    }

    // 5. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user.email);

    // 6. Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 7. Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.warn('Welcome email failed (github callback):', err?.message || err);
    });

    // 8. Redirect to Agent Frontend
    const base = process.env.AGENT_FRONTEND_URL || 'https://omaju-chatinterface-adityakatyal.vercel.app/auth/callback';
    const nextParam = state ? `&next=${encodeURIComponent(state)}` : '';
    return NextResponse.redirect(`${base}?token=${accessToken}&refreshToken=${refreshToken}&provider=github${nextParam}`);

  } catch (error) {
    console.error('GitHub OAuth success error:', error);
    return errorRedirect('Authentication failed');
  }
}
