/**
 * Reusable response helpers for consistent JSON API responses.
 */

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {object} options
 */
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options
 */
export const sendError = (
  res,
  { statusCode = 500, message = 'Internal Server Error', errors = null } = {}
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};

/**
 * Create an application error to pass to next().
 * @param {string} message
 * @param {number} statusCode
 * @param {Array|null} errors
 */
export const createAppError = (message, statusCode = 500, errors = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
};
