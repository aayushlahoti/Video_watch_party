import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room.js';
import { createAppError } from '../utils/response.js';

/**
 * Generate a unique 8-character uppercase room code.
 * @returns {Promise<string>}
 */
const generateUniqueRoomCode = async () => {
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Use the first 8 characters of a UUID (without hyphens), uppercased
    const code = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const exists = await Room.findOne({ roomCode: code });
    if (!exists) return code;
  }
  throw createAppError('Could not generate a unique room code. Please try again.', 500);
};

/**
 * Create a new room. The creating user is automatically set as host.
 * @param {string} hostId - The authenticated user's _id
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const createRoom = async (hostId) => {
  const roomCode = await generateUniqueRoomCode();

  const room = await Room.create({
    roomCode,
    host: hostId,
    participants: [{ userId: hostId, role: 'host', joinedAt: new Date() }],
  });

  return room.populate('host', 'username email');
};

/**
 * Join an existing room as a participant.
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const joinRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) throw createAppError('Room not found.', 404);

  const alreadyJoined = room.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );

  if (!alreadyJoined) {
    room.participants.push({ userId, role: 'participant', joinedAt: new Date() });
    await room.save();
  }

  return room.populate([
    { path: 'host', select: 'username email' },
    { path: 'participants.userId', select: 'username email' },
  ]);
};

/**
 * Leave a room. If the host leaves and there are other participants, a new host is auto-assigned.
 * If the room becomes empty, it is deleted.
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<{ deleted: boolean, room: object | null }>}
 */
export const leaveRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) throw createAppError('Room not found.', 404);

  const participantIndex = room.participants.findIndex(
    (p) => p.userId.toString() === userId.toString()
  );
  if (participantIndex === -1) throw createAppError('You are not a participant of this room.', 400);

  room.participants.splice(participantIndex, 1);

  // If room is now empty, delete it
  if (room.participants.length === 0) {
    await Room.findByIdAndDelete(roomId);
    return { deleted: true, room: null };
  }

  // If the leaving user was host, transfer host to the next participant
  if (room.host.toString() === userId.toString()) {
    const newHost = room.participants[0];
    newHost.role = 'host';
    room.host = newHost.userId;
  }

  await room.save();
  return { deleted: false, room };
};

/**
 * Get room details by ID.
 * @param {string} roomId
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const getRoomById = async (roomId) => {
  const room = await Room.findById(roomId).populate([
    { path: 'host', select: 'username email' },
    { path: 'participants.userId', select: 'username email' },
  ]);

  if (!room) throw createAppError('Room not found.', 404);
  return room;
};

/**
 * Assign a role to a participant (host/moderator action).
 * @param {string} roomId
 * @param {string} requestingUserId - Must be host
 * @param {string} targetUserId
 * @param {'moderator'|'participant'} newRole
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const assignRole = async (roomId, requestingUserId, targetUserId, newRole) => {
  const room = await Room.findById(roomId);
  if (!room) throw createAppError('Room not found.', 404);

  if (room.host.toString() !== requestingUserId.toString()) {
    throw createAppError('Only the host can assign roles.', 403);
  }

  if (targetUserId.toString() === requestingUserId.toString()) {
    throw createAppError('Host cannot change their own role.', 400);
  }

  const participant = room.participants.find(
    (p) => p.userId.toString() === targetUserId.toString()
  );
  if (!participant) throw createAppError('Target user is not in this room.', 404);

  participant.role = newRole;
  await room.save();

  return room.populate([
    { path: 'host', select: 'username email' },
    { path: 'participants.userId', select: 'username email' },
  ]);
};

/**
 * Transfer host privileges to another participant.
 * @param {string} roomId
 * @param {string} currentHostId
 * @param {string} newHostId
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const transferHost = async (roomId, currentHostId, newHostId) => {
  const room = await Room.findById(roomId);
  if (!room) throw createAppError('Room not found.', 404);

  if (room.host.toString() !== currentHostId.toString()) {
    throw createAppError('Only the current host can transfer host privileges.', 403);
  }

  const newHostParticipant = room.participants.find(
    (p) => p.userId.toString() === newHostId.toString()
  );
  if (!newHostParticipant) throw createAppError('Target user is not in this room.', 404);

  // Demote old host to participant
  const oldHostParticipant = room.participants.find(
    (p) => p.userId.toString() === currentHostId.toString()
  );
  if (oldHostParticipant) oldHostParticipant.role = 'participant';

  // Promote new host
  newHostParticipant.role = 'host';
  room.host = newHostId;

  await room.save();

  return room.populate([
    { path: 'host', select: 'username email' },
    { path: 'participants.userId', select: 'username email' },
  ]);
};

/**
 * Remove a participant from the room (host/moderator action).
 * @param {string} roomId
 * @param {string} requestingUserId - Must be host or moderator
 * @param {string} targetUserId
 * @returns {Promise<import('../models/Room.js').default>}
 */
export const removeMember = async (roomId, requestingUserId, targetUserId) => {
  const room = await Room.findById(roomId);
  if (!room) throw createAppError('Room not found.', 404);

  const requester = room.participants.find(
    (p) => p.userId.toString() === requestingUserId.toString()
  );
  if (!requester || !['host', 'moderator'].includes(requester.role)) {
    throw createAppError('Only the host or a moderator can remove participants.', 403);
  }

  if (targetUserId.toString() === room.host.toString()) {
    throw createAppError('The host cannot be removed from the room.', 400);
  }

  const targetIndex = room.participants.findIndex(
    (p) => p.userId.toString() === targetUserId.toString()
  );
  if (targetIndex === -1) throw createAppError('Target user is not in this room.', 404);

  room.participants.splice(targetIndex, 1);
  await room.save();

  return room.populate([
    { path: 'host', select: 'username email' },
    { path: 'participants.userId', select: 'username email' },
  ]);
};
