import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { EmailUser, findUserAcrossCollections } from '@/lib/models/User';
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
    const { email, password, name } = body;

    // 1. Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Please provide a valid email address' }, { status: 400, headers: corsHeaders });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length < 5 || normalizedEmail.length > 100) {
      return NextResponse.json({ success: false, message: 'Please provide a valid email address between 5 and 100 characters' }, { status: 400, headers: corsHeaders });
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return NextResponse.json({ success: false, message: 'Password must be between 6 and 128 characters' }, { status: 400, headers: corsHeaders });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ success: false, message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' }, { status: 400, headers: corsHeaders });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400, headers: corsHeaders });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return NextResponse.json({ success: false, message: 'Name must be between 2 and 50 characters' }, { status: 400, headers: corsHeaders });
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmedName)) {
      return NextResponse.json({ success: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' }, { status: 400, headers: corsHeaders });
    }

    // 2. Check existing user
    const existingUser = await findUserAcrossCollections(normalizedEmail);
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email already exists' }, { status: 409, headers: corsHeaders });
    }

    // 3. Create user
    const newUser = new EmailUser({
      email: normalizedEmail,
      password,
      name: trimmedName,
    });
    await newUser.save();

    // 4. Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser.email);

    // 5. Update last login
    newUser.lastLogin = new Date();
    await newUser.save();

    // 6. Send welcome email (non-blocking)
    sendWelcomeEmail(newUser.email, newUser.name).catch((err) => {
      console.warn('Welcome email failed (signup route):', err?.message || err);
    });

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          isEmailVerified: newUser.isEmailVerified,
          provider: 'email',
          createdAt: newUser.createdAt,
        },
        tokens: { accessToken, refreshToken },
      },
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'User with this email already exists' }, { status: 409, headers: corsHeaders });
    }
    return NextResponse.json({ success: false, message: 'Internal server error during registration' }, { status: 500, headers: corsHeaders });
  }
}
