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
    
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID || '';

    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID is not configured');
      return NextResponse.json({ success: false, message: 'Google OAuth client ID is not configured' }, { status: 500, headers: corsHeaders });
    }

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=profile%20email&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('Google Auth redirect error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error during Google authentication' }, { status: 500, headers: corsHeaders });
  }
}
