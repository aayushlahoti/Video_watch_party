import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

/**
 * Signs a JWT token for the given payload.
 * @param {object} payload - The data to encode inside the token.
 * @param {object} options - Optional JWT signing options.
 * @returns {string} The signed JWT string.
 */
export const signToken = (payload, options = {}) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: options.expiresIn || config.jwt.accessExpiresIn || config.jwt.expiresIn,
  });
};

/**
 * Verifies a JWT token and returns the decoded payload.
 * @param {string} token
 * @returns {object} Decoded payload.
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};
