import { Router } from 'express';
import { register, login, logout, getProfile, refresh } from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidators.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidator, handleValidationErrors, register);

// POST /api/auth/login
router.post('/login', loginValidator, handleValidationErrors, login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// GET /api/auth/profile  (protected)
router.get('/profile', authenticate, getProfile);

export default router;
