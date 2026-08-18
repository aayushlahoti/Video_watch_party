import { body, param } from 'express-validator';
import { normalizeRoomIdentifier } from '../services/roomService.js';

const roomIdentifierRule = param('id')
  .trim()
  .notEmpty()
  .withMessage('Room identifier is required')
  .custom((value) => {
    if (!normalizeRoomIdentifier(value)) {
      throw new Error('Invalid room identifier. Use a room code or a Mongo room ID.');
    }
    return true;
  });

export const createRoomValidator = [
  // No body required — room code is generated server-side
];

export const joinRoomValidator = [roomIdentifierRule];

export const leaveRoomValidator = [roomIdentifierRule];

export const getRoomValidator = [roomIdentifierRule];

export const assignRoleValidator = [
  param('id').isMongoId().withMessage('Invalid room ID'),
  body('userId').notEmpty().withMessage('userId is required').isMongoId().withMessage('Invalid userId'),
  body('role')
    .notEmpty()
    .withMessage('role is required')
    .isIn(['moderator', 'participant'])
    .withMessage('Role must be moderator or participant'),
];

export const transferHostValidator = [
  param('id').isMongoId().withMessage('Invalid room ID'),
  body('userId').notEmpty().withMessage('userId is required').isMongoId().withMessage('Invalid userId'),
];

export const removeMemberValidator = [
  param('id').isMongoId().withMessage('Invalid room ID'),
  body('userId').notEmpty().withMessage('userId is required').isMongoId().withMessage('Invalid userId'),
];
