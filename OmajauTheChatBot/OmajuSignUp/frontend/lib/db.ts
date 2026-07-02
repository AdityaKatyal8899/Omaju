import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
  console.warn('[db] MONGO_URI is not set. Database connections will fail.');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      console.log('[db] MongoDB Connected via Mongoose caching utility');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
