import { Router } from 'express';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  assignRole,
  transferHost,
  removeMember,
} from '../controllers/roomController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import {
  joinRoomValidator,
  leaveRoomValidator,
  getRoomValidator,
  assignRoleValidator,
  transferHostValidator,
  removeMemberValidator,
} from '../validators/roomValidators.js';

const router = Router();

// All room routes require authentication
router.use(authenticate);

// POST /api/rooms
router.post('/', createRoom);

// POST /api/rooms/:id/join
router.post('/:id/join', joinRoomValidator, handleValidationErrors, joinRoom);

// POST /api/rooms/:id/leave
router.post('/:id/leave', leaveRoomValidator, handleValidationErrors, leaveRoom);

// GET /api/rooms/:id
router.get('/:id', getRoomValidator, handleValidationErrors, getRoom);

// PATCH /api/rooms/:id/role  (host only)
router.patch('/:id/role', assignRoleValidator, handleValidationErrors, assignRole);

// PATCH /api/rooms/:id/transfer  (host only)
router.patch('/:id/transfer', transferHostValidator, handleValidationErrors, transferHost);

// DELETE /api/rooms/:id/member  (host or moderator)
router.delete('/:id/member', removeMemberValidator, handleValidationErrors, removeMember);

export default router;
