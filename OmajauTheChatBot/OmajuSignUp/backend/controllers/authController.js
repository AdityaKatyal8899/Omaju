const { EmailUser, GoogleUser, GithubUser, findUserAcrossCollections, findUserByProviderId } = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/mailer');

// ========================
// Email/Password Signup
// ========================
const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await findUserAcrossCollections(email);
    if (existingUser) return res.status(409).json({ success: false, message: 'User with this email already exists' });

    const newUser = new EmailUser({ email, password, name });
    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser.email);

    newUser.lastLogin = new Date();
    await newUser.save();

    // Send welcome email (non-blocking failure)
    try {
      await sendWelcomeEmail(newUser.email, newUser.name);
    } catch (e) {
      console.warn('Welcome email failed (signup):', e?.message || e);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          isEmailVerified: newUser.isEmailVerified,
          provider: 'email',
          createdAt: newUser.createdAt,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'User with this email already exists' });

    res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
};

// ========================
// Email/Password Signin
// ========================
const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userResult = await findUserAcrossCollections(email);
    if (!userResult) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const { user, collection } = userResult;

    if (collection !== 'EmailUser') {
      return res.status(401).json({
        success: false,
        message: `This email is registered with ${collection === 'GoogleUser' ? 'Google' : 'GitHub'}. Please use the appropriate login method.`
      });
    }

    if (user.isLocked()) return res.status(423).json({ success: false, message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.loginAttempts > 0) await user.resetLoginAttempts();

    const { accessToken, refreshToken } = generateTokens(user.email);

    user.lastLogin = new Date();
    await user.save();

    // Send welcome email (non-blocking failure)
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
      console.warn('Welcome email failed (signin):', e?.message || e);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          provider: 'email',
          lastLogin: user.lastLogin,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

// ========================
// Refresh Token
// ========================
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);

    const userResult = await findUserAcrossCollections(decoded.userId);
    if (!userResult || !userResult.user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const tokens = generateTokens(userResult.user.email);

    res.json({ success: true, message: 'Tokens refreshed successfully', data: { tokens } });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ========================
// Google OAuth Success
// ========================
const googleOAuthSuccess = async (req, res) => {
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ success: false, message: 'Google authentication failed' });

    const { accessToken, refreshToken } = generateTokens(user.email);
    user.lastLogin = new Date();
    await user.save();

    // Fire welcome email, but don't block redirect on failure
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
      console.warn('Welcome email failed (google oauth):', e?.message || e);
    }

    const base = process.env.AGENT_FRONTEND_URL || 'http://localhost:3000/auth/callback';
    const nextParam = req.query.state ? `&next=${encodeURIComponent(req.query.state)}` : '';
    res.redirect(`${base}?token=${accessToken}&refreshToken=${refreshToken}&provider=google${nextParam}`);
  } catch (error) {
    console.error('Google OAuth success error:', error);
    const agentFrontendUrl = process.env.AGENT_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${agentFrontendUrl}/auth/error?message=Authentication failed`);
  }
};

// ========================
// GitHub OAuth Success
// ========================
const githubOAuthSuccess = async (req, res) => {
  try {
    const { user } = req;
    if (!user) return res.status(401).json({ success: false, message: "GitHub authentication failed" });

    const { accessToken, refreshToken } = generateTokens(user.email);
    user.lastLogin = new Date();
    await user.save();

    // Fire welcome email, but don't block redirect on failure
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
      console.warn('Welcome email failed (github oauth):', e?.message || e);
    }

    const base = process.env.AGENT_FRONTEND_URL || "https://omaju-chatinterface-adityakatyal.vercel.app/auth/callback";
    const nextParam = req.query.state ? `&next=${encodeURIComponent(req.query.state)}` : '';
    res.redirect(`${base}?token=${accessToken}&refreshToken=${refreshToken}&provider=github${nextParam}`);
  } catch (error) {
    console.error("GitHub OAuth success error:", error);
    const agentFrontendUrl = process.env.AGENT_FRONTEND_URL || "https://omaju-chatinterface-adityakatyal.vercel.app";
    res.redirect(`${agentFrontendUrl}/auth/error?message=Authentication failed`);
  }
};

// ========================
// OAuth Failure
// ========================
const oauthFailure = (req, res) => {
  const agentFrontendUrl = process.env.AGENT_FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${agentFrontendUrl}/auth/error?message=Authentication failed`);
};

// ========================
// Get Profile
// ========================
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const collection = req.userCollection;

    let provider = 'email';
    if (collection === 'GoogleUser') provider = 'google';
    if (collection === 'GithubUser') provider = 'github';

    res.json({
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
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching profile' });
  }
};

// ========================
// Logout
// ========================
const logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during logout' });
  }
};

module.exports = {
  signup,
  signin,
  refreshToken,
  googleOAuthSuccess,
  githubOAuthSuccess,
  oauthFailure,
  getProfile,
  logout,
};
