import { body, param } from 'express-validator';

export const createRoomValidator = [
  // No body required — room code is generated server-side
];

export const joinRoomValidator = [
  param('id').notEmpty().withMessage('Room ID is required').isMongoId().withMessage('Invalid room ID'),
];

export const leaveRoomValidator = [
  param('id').notEmpty().withMessage('Room ID is required').isMongoId().withMessage('Invalid room ID'),
];

export const getRoomValidator = [
  param('id').notEmpty().withMessage('Room ID is required').isMongoId().withMessage('Invalid room ID'),
];

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
