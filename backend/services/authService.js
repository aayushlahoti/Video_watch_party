import crypto from 'crypto';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { createAppError } from '../utils/response.js';
import { config } from '../config/config.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  // secure: true — enabled in production via app.js or conditionally
};

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

const parseExpiresInToMs = (value) => {
  const match = /^([0-9]+)([smhd])$/i.exec(value);
  if (!match) return 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const pruneExpiredRefreshTokens = (user) => {
  if (!user.refreshTokens) {
    user.refreshTokens = [];
    return;
  }

  user.refreshTokens = user.refreshTokens.filter(
    (entry) => !entry.revokedAt && entry.expiresAt > new Date()
  );
};

const createRefreshTokenRecord = (user) => {
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseExpiresInToMs(config.jwt.refreshExpiresIn));

  pruneExpiredRefreshTokens(user);
  user.refreshTokens.push({ tokenHash: refreshTokenHash, expiresAt, revokedAt: null });

  return { refreshToken, refreshTokenHash };
};

const getAccessToken = (user) =>
  signToken({ id: user._id, username: user.username }, {
    expiresIn: config.jwt.accessExpiresIn,
  });

/**
 * Register a new user.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export const registerUser = async ({ username, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createAppError('A user with this email already exists.', 409);
  }

  const user = await User.create({ username, email, password });
  const accessToken = getAccessToken(user);
  const { refreshToken } = createRefreshTokenRecord(user);
  await user.save();

  return { user: user.toPublicJSON(), accessToken, refreshToken };
};

/**
 * Authenticate a user and return tokens.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // Deliberate vague error to prevent user enumeration
    throw createAppError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw createAppError('Invalid email or password.', 401);
  }

  const accessToken = getAccessToken(user);
  const { refreshToken } = createRefreshTokenRecord(user);
  await user.save();

  return { user: user.toPublicJSON(), accessToken, refreshToken };
};

export const revokeRefreshToken = async (userId, refreshToken) => {
  const user = await User.findById(userId);
  if (!user) return;

  const targetHash = hashToken(refreshToken);
  pruneExpiredRefreshTokens(user);
  user.refreshTokens = (user.refreshTokens || []).map((entry) => {
    if (entry.tokenHash === targetHash) {
      return { ...entry, revokedAt: new Date() };
    }
    return entry;
  });
  await user.save();
};

export const revokeAllRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;

  pruneExpiredRefreshTokens(user);
  user.refreshTokens = (user.refreshTokens || []).map((entry) => ({ ...entry, revokedAt: new Date() }));
  await user.save();
};

export const refreshUserSession = async (refreshToken) => {
  if (!refreshToken) {
    throw createAppError('Refresh token is required.', 401);
  }

  const targetHash = hashToken(refreshToken);
  const user = await User.findOne({ 'refreshTokens.tokenHash': targetHash });
  if (!user) {
    throw createAppError('Refresh token is invalid or has been revoked.', 401);
  }

  pruneExpiredRefreshTokens(user);

  const tokenRecord = (user.refreshTokens || []).find(
    (entry) => entry.tokenHash === targetHash && !entry.revokedAt && entry.expiresAt > new Date()
  );

  if (!tokenRecord) {
    throw createAppError('Refresh token is invalid or has been revoked.', 401);
  }

  tokenRecord.revokedAt = new Date();
  const accessToken = getAccessToken(user);
  const { refreshToken: newRefreshToken } = createRefreshTokenRecord(user);
  await user.save();

  return { user: user.toPublicJSON(), accessToken, refreshToken: newRefreshToken };
};

/**
 * Get cookie options (adds secure flag in production).
 * @param {string} env - The NODE_ENV value.
 * @returns {object}
 */
export const getCookieOptions = (env) => ({
  ...COOKIE_OPTIONS,
  secure: env === 'production',
});

export const getCookieNames = () => ({ accessToken: ACCESS_TOKEN_COOKIE, refreshToken: REFRESH_TOKEN_COOKIE });
