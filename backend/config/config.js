import dotenv from 'dotenv';

dotenv.config();

const readNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: readNumber(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI || '',
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cookie: {
    secret: process.env.COOKIE_SECRET || '',
  },
  rateLimit: {
    windowMs: readNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxRequests: readNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  },
};

if (!config.mongodbUri && config.env !== 'test') {
  console.warn('WARNING: MONGODB_URI is not defined in the environment variables.');
}
