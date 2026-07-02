import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Base user fields
const baseUserSchemaFields = {
  uid: {
    type: String,
    default: uuidv4,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
};

// Email User Schema
const emailUserSchema = new Schema({
  ...baseUserSchemaFields,
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
});

// Google User Schema
const googleUserSchema = new Schema({
  ...baseUserSchemaFields,
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  provider: {
    type: String,
    default: 'google',
  },
});

// GitHub User Schema
const githubUserSchema = new Schema({
  ...baseUserSchemaFields,
  githubId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  provider: {
    type: String,
    default: 'github',
  },
});

// Pre-save middleware for EmailUser to hash password
emailUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password for EmailUser
emailUserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked for EmailUser
emailUserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Method to increment login attempts for EmailUser
emailUserSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts for EmailUser
emailUserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Update timestamps on save
const updateTimestamp = function (this: any, next?: any) {
  this.updatedAt = new Date();
  if (typeof next === 'function') {
    next();
  }
};

emailUserSchema.pre('save', updateTimestamp);
googleUserSchema.pre('save', updateTimestamp);
githubUserSchema.pre('save', updateTimestamp);

// Create models (reusing if already defined to avoid Mongoose OverwriteModelError)
export const EmailUser = mongoose.models.EmailUser || mongoose.model('EmailUser', emailUserSchema);
export const GoogleUser = mongoose.models.GoogleUser || mongoose.model('GoogleUser', googleUserSchema);
export const GithubUser = mongoose.models.GithubUser || mongoose.model('GithubUser', githubUserSchema);

// Helper function to find user across all collections by email
export const findUserAcrossCollections = async (email: string) => {
  try {
    const emailLower = email.toLowerCase();
    // Search in EmailUser collection
    let user = await EmailUser.findOne({ email: emailLower });
    if (user) {
      return { user, collection: 'EmailUser' };
    }

    // Search in GoogleUser collection
    user = await GoogleUser.findOne({ email: emailLower });
    if (user) {
      return { user, collection: 'GoogleUser' };
    }

    // Search in GithubUser collection
    user = await GithubUser.findOne({ email: emailLower });
    if (user) {
      return { user, collection: 'GithubUser' };
    }

    return null;
  } catch (error: any) {
    throw new Error(`Error finding user: ${error.message}`);
  }
};

// Helper function to find user by provider ID
export const findUserByProviderId = async (provider: string, providerId: string) => {
  try {
    if (provider === 'google') {
      const user = await GoogleUser.findOne({ googleId: providerId });
      return user ? { user, collection: 'GoogleUser' } : null;
    }
    
    if (provider === 'github') {
      const user = await GithubUser.findOne({ githubId: providerId });
      return user ? { user, collection: 'GithubUser' } : null;
    }
    
    return null;
  } catch (error: any) {
    throw new Error(`Error finding user by provider ID: ${error.message}`);
  }
};
