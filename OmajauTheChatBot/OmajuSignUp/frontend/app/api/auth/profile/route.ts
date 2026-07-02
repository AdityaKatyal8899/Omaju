import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const authResult = await verifyAuthRequest(request);

    if (authResult.error) {
      return NextResponse.json({
        success: false,
        message: authResult.error
      }, { status: authResult.status || 401, headers: corsHeaders });
    }

    const { user, collection } = authResult;
    let provider = 'email';
    if (collection === 'GoogleUser') provider = 'google';
    if (collection === 'GithubUser') provider = 'github';

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          ...(collection === 'EmailUser' && { isEmailVerified: user.isEmailVerified }),
          ...(collection === 'GithubUser' && { username: user.username }),
        },
      },
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error while fetching profile' }, { status: 500, headers: corsHeaders });
  }
}
