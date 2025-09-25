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
 * Security Middleware
 * ========================
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, try later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

/**
 * ========================
 * CORS Configuration
 * ========================
 */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  process.env.FRONTEND_URL,
  process.env.AGENT_FRONTEND_URL,
  'https://omaju-signup.vercel.app',
  'https://omaju-chat-adityakatyal.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
}));

/**
 * ========================
 * Body Parsing
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
 * Routes
 * ========================
 */
app.use('/api/auth', authRoutes);

/**
 * ========================
 * Root Route
 * ========================
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AgentSignUp Backend API',
    version: '1.0.0'
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
  res.status(404).json({ success: false, message: 'Route not found' });
});

/**
 * ========================
 * Global Error Handler
 * ========================
 */
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS policy violation' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/**
 * ========================
 * Start Server after DB Connect
 * ========================
 */
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Agent frontend URL: ${process.env.AGENT_FRONTEND_URL}`);
      console.log(`🔗 Onboarding frontend URL: ${process.env.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
