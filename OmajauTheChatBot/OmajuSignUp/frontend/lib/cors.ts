import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://omaju-onboarding.vercel.app',
  'https://omaju-onboarding.onrender.com',
  'https://omaju-chatinterface-adityakatyal.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

export function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const headers = new Headers();

  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  return headers;
}

export function handleCorsPreflight(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}
