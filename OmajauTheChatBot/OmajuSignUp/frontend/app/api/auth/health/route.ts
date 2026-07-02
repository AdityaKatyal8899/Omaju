import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    let dbStatus = 'disconnected';
    try {
      await connectDB();
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `disconnected (${e.message})`;
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication service is running',
      mongodb: dbStatus,
      timestamp: new Date().toISOString(),
    }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Health check failed' }, { status: 500, headers: corsHeaders });
  }
}
