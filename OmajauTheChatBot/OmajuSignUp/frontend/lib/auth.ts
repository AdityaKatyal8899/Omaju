import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import connectDB from './db';
import { findUserAcrossCollections } from './models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

export async function verifyAuthRequest(req: NextRequest) {
  await connectDB();
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Access token required', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userResult = await findUserAcrossCollections(decoded.userId);

    if (!userResult) {
      return { error: 'Invalid token - user not found', status: 401 };
    }

    if (!userResult.user.isActive) {
      return { error: 'Account is deactivated', status: 401 };
    }

    return { user: userResult.user, collection: userResult.collection };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'Token expired', status: 401 };
    }
    if (error.name === 'JsonWebTokenError') {
      return { error: 'Invalid token', status: 401 };
    }
    console.error('Token verification error:', error);
    return { error: 'Internal server error during authentication', status: 500 };
  }
}
