import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { findUserAcrossCollections } from '@/lib/models/User';
import { generateTokens } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    await connectDB();
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Please provide a valid email address' }, { status: 400, headers: corsHeaders });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400, headers: corsHeaders });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userResult = await findUserAcrossCollections(normalizedEmail);
    if (!userResult) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401, headers: corsHeaders });
    }

    const { user, collection } = userResult;

    if (collection !== 'EmailUser') {
      const providerLabel = collection === 'GoogleUser' ? 'Google' : 'GitHub';
      return NextResponse.json({
        success: false,
        message: `This email is registered with ${providerLabel}. Please use the appropriate login method.`
      }, { status: 401, headers: corsHeaders });
    }

    if (user.isLocked()) {
      return NextResponse.json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      }, { status: 423, headers: corsHeaders });
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, message: 'Account is deactivated' }, { status: 401, headers: corsHeaders });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401, headers: corsHeaders });
    }

    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    const { accessToken, refreshToken } = generateTokens(user.email);

    user.lastLogin = new Date();
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.warn('Welcome email failed (signin route):', err?.message || err);
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          provider: 'email',
          lastLogin: user.lastLogin,
        },
        tokens: { accessToken, refreshToken },
      },
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Signin error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error during login' }, { status: 500, headers: corsHeaders });
  }
}
