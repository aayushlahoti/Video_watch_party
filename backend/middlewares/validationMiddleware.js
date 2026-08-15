import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.js';

/**
 * Middleware that reads express-validator results and short-circuits the request
 * with a 422 Unprocessable Entity if any validation errors exist.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return sendError(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  return next();
};
