require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const passport = require('./config/passport');

const app = express();

/**
 * ========================
 * Database Connection
 * ========================
 */
connectDB();


app.set('trust proxy', 1);

/**
 * ========================
 * Security Middleware
 * ========================
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/**
 * ========================
 * Global Rate Limiting
 * ========================
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

/**
 * ========================
 * CORS Configuration
 * ========================
 */
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests

    const allowedOrigins = [
      'http://localhost:3000',    // OmajuChat frontend
      'http://localhost:3001',    // OmajuSignUp frontend
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://omaju-signup.vercel.app',
      'https://omaju-chat-adityakatyal.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

/**
 * ========================
 * Body Parsing Middleware
 * ========================
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * ========================
 * Initialize Passport
 * ========================
 */
app.use(passport.initialize());

/**
 * ========================
 * Debug Info
 * ========================
 */
console.log('🔍 Debug Info:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? 'Set' : 'Missing');

/**
 * ========================
 * Routes
 * ========================
 */
app.use('/api/auth', authRoutes);
console.log('📋 Registered auth routes loaded');

/**
 * ========================
 * Root Route
 * ========================
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AgentSignUp Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        signin: 'POST /api/auth/signin',
        refreshToken: 'POST /api/auth/refresh-token',
        google: 'GET /api/auth/google',
        googleCallback: 'GET /api/auth/google/callback',
        github: 'GET /api/auth/github',
        githubCallback: 'GET /api/auth/github/callback',
        profile: 'GET /api/auth/profile',
        logout: 'POST /api/auth/logout',
        health: 'GET /api/auth/health',
      },
    },
  });
});

/**
 * ========================
 * Health Check
 * ========================
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * ========================
 * 404 Handler
 * ========================
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * ========================
 * Global Error Handler
 * ========================
 */
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS policy violation' });
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid data format' });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

/**
 * ========================
 * Graceful Shutdown
 * ========================
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

/**
 * ========================
 * Start Server
 * ========================
 */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
});
