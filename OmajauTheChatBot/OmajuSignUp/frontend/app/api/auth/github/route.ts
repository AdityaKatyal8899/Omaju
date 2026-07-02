import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('next') || '';

    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    
    const callbackUrl = process.env.GITHUB_REDIRECT_URI || `${protocol}://${host}/api/auth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID || '';

    if (!clientId) {
      console.error('GITHUB_CLIENT_ID is not configured');
      return NextResponse.json({ success: false, message: 'GitHub OAuth client ID is not configured' }, { status: 500, headers: corsHeaders });
    }

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(githubAuthUrl);
  } catch (error) {
    console.error('GitHub Auth redirect error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error during GitHub authentication' }, { status: 500, headers: corsHeaders });
  }
}
