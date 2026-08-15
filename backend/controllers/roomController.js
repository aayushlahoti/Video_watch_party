import * as roomService from '../services/roomService.js';
import { sendSuccess } from '../utils/response.js';

/**
 * POST /api/rooms
 */
export const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.user._id);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Room created successfully.',
      data: { room },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/rooms/:id/join
 */
export const joinRoom = async (req, res, next) => {
  try {
    const room = await roomService.joinRoom(req.params.id, req.user._id);
    return sendSuccess(res, { message: 'Joined room successfully.', data: { room } });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/rooms/:id/leave
 */
export const leaveRoom = async (req, res, next) => {
  try {
    const { deleted, room } = await roomService.leaveRoom(req.params.id, req.user._id);
    return sendSuccess(res, {
      message: deleted ? 'Room closed (no participants remaining).' : 'Left room successfully.',
      data: { room },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/rooms/:id
 */
export const getRoom = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    return sendSuccess(res, { message: 'Room retrieved successfully.', data: { room } });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/rooms/:id/role
 */
export const assignRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const room = await roomService.assignRole(req.params.id, req.user._id, userId, role);
    return sendSuccess(res, { message: 'Role assigned successfully.', data: { room } });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/rooms/:id/transfer
 */
export const transferHost = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const room = await roomService.transferHost(req.params.id, req.user._id, userId);
    return sendSuccess(res, { message: 'Host transferred successfully.', data: { room } });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/rooms/:id/member
 */
export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const room = await roomService.removeMember(req.params.id, req.user._id, userId);
    return sendSuccess(res, { message: 'Member removed successfully.', data: { room } });
  } catch (err) {
    return next(err);
  }
};
