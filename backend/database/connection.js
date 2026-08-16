import mongoose from 'mongoose';
import { config } from '../config/config.js';
import User from '../models/User.js';
import Room from '../models/Room.js';

const DEFAULT_MAX_POOL_SIZE = 50;
const DEFAULT_MIN_POOL_SIZE = 5;

/**
 * Connects to MongoDB using production-friendly options and retry/backoff.
 * Ensures indexes are created after a successful connection.
 */
export const connectDatabase = async () => {
  const mongoUri = config.mongodbUri;

  if (!mongoUri && config.env !== 'test') {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  // Configure mongoose behavior
  mongoose.set('strictQuery', false);
  // Disable autoIndex in production to avoid index-building during runtime
  mongoose.set('autoIndex', config.env !== 'production');

  const opts = {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || DEFAULT_MAX_POOL_SIZE,
    minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || DEFAULT_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_MS) || 5000,
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
    family: 4,
    // rely on the URI for replicaSet and auth options
  };

  const maxRetries = Number(process.env.MONGODB_CONNECT_RETRIES) || 5;
  let attempt = 0;

  const attemptConnect = async () => {
    attempt += 1;
    try {
      const conn = await mongoose.connect(mongoUri, opts);
      console.log(`Connected to MongoDB host(s): ${conn.connection.host} (${config.env})`);

      // In production we prefer creating indexes with an explicit call from a migration
      // but ensure indexes exist for development and CI runs.
      try {
        await Promise.all([User.createIndexes(), Room.createIndexes()]);
        console.log('Ensured MongoDB indexes for User and Room models');
      } catch (ixErr) {
        console.warn('Index creation warning:', ixErr.message || ixErr);
      }

      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = Math.min(30000, 1000 * 2 ** attempt); // exponential backoff, cap 30s
        console.log(`Retrying database connection in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((res) => setTimeout(res, delay));
        return attemptConnect();
      }
      console.error('Exceeded maximum MongoDB connection retries. Exiting process.');
      process.exit(1);
    }
  };

  if (config.env === 'test') {
    // In test environment, connect normally but don't exit on failure
    try {
      return await mongoose.connect(mongoUri, opts);
    } catch (err) {
      throw err;
    }
  }

  return attemptConnect();
};

/**
 * Disconnects from MongoDB cleanly.
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('Successfully disconnected from MongoDB');
  } catch (error) {
    console.error(`Error disconnecting database: ${error.message}`);
  }
};
