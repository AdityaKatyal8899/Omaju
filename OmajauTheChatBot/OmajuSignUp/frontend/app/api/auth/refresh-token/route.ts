import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { findUserAcrossCollections } from '@/lib/models/User';
import { generateTokens, verifyRefreshToken } from '@/lib/auth';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    await connectDB();
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ success: false, message: 'Refresh token is required' }, { status: 400, headers: corsHeaders });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Invalid or expired refresh token' }, { status: 401, headers: corsHeaders });
    }

    const userResult = await findUserAcrossCollections(decoded.userId);
    if (!userResult || !userResult.user.isActive) {
      return NextResponse.json({ success: false, message: 'Invalid or expired refresh token' }, { status: 401, headers: corsHeaders });
    }

    const tokens = generateTokens(userResult.user.email);

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ success: false, message: 'Invalid or expired refresh token' }, { status: 401, headers: corsHeaders });
  }
}
