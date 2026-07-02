import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    return NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error during logout' }, { status: 500, headers: corsHeaders });
  }
}
