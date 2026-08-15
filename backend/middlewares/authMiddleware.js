import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import User from '../models/User.js';
import { getCookieNames } from '../services/authService.js';

/**
 * Middleware that protects routes requiring a valid JWT.
 * Token is read from the Authorization header (Bearer scheme) or the signed cookie.
 * Attaches the authenticated user to req.user on success.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to signed cookies
    const { accessToken } = getCookieNames();
    if (!token && req.signedCookies?.[accessToken]) {
      token = req.signedCookies[accessToken];
    }

    if (!token && req.signedCookies?.token) {
      token = req.signedCookies.token;
    }

    if (!token) {
      return sendError(res, { statusCode: 401, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);

    // Verify the user still exists in the database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, { statusCode: 401, message: 'User belonging to this token no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, { statusCode: 401, message: 'Token has expired. Please log in again.' });
    }
    return sendError(res, { statusCode: 401, message: 'Invalid token. Access denied.' });
  }
};
