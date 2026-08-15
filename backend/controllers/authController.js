import {
  registerUser,
  loginUser,
  getCookieOptions,
  getCookieNames,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  refreshUserSession,
} from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/config.js';

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const { user, accessToken, refreshToken } = await registerUser({ username, email, password });
    const { accessToken: accessCookieName, refreshToken: refreshCookieName } = getCookieNames();

    res.cookie(accessCookieName, accessToken, getCookieOptions(config.env));
    res.cookie(refreshCookieName, refreshToken, getCookieOptions(config.env));

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Registration successful. Welcome to Watch Party!',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ email, password });
    const { accessToken: accessCookieName, refreshToken: refreshCookieName } = getCookieNames();

    res.cookie(accessCookieName, accessToken, getCookieOptions(config.env));
    res.cookie(refreshCookieName, refreshToken, getCookieOptions(config.env));

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  const { accessToken: accessCookieName, refreshToken: refreshCookieName } = getCookieNames();
  const refreshToken = req.signedCookies?.[refreshCookieName] || req.signedCookies?.token;

  if (req.user?.id) {
    if (refreshToken) {
      await revokeRefreshToken(req.user.id, refreshToken);
    } else {
      await revokeAllRefreshTokens(req.user.id);
    }
  }

  res.clearCookie(accessCookieName);
  res.clearCookie(refreshCookieName);
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out successfully.' });
};

/**
 * GET /api/auth/profile
 * Requires authenticate middleware.
 */
export const getProfile = (req, res) => {
  return sendSuccess(res, {
    message: 'Profile retrieved successfully.',
    data: { user: req.user },
  });
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken: refreshCookieName } = getCookieNames();
    const refreshToken = req.signedCookies?.[refreshCookieName] || req.signedCookies?.token;

    if (!refreshToken) {
      return sendSuccess(res, { statusCode: 401, message: 'Refresh token is required.' });
    }

    const { user, accessToken, refreshToken: newRefreshToken } = await refreshUserSession(refreshToken);
    const { accessToken: accessCookieName } = getCookieNames();

    res.cookie(accessCookieName, accessToken, getCookieOptions(config.env));
    res.cookie(refreshCookieName, newRefreshToken, getCookieOptions(config.env));

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Token refreshed successfully.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
};
