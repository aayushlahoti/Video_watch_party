/**
 * Redis-backed room state store.
 *
 * Replaces the previous in-memory Map with Redis so that state is shared
 * across all backend instances.
 *
 * Redis key layout:
 *   room:{roomId}:state        — Hash  { videoId, currentTime, isPlaying, lastUpdated }
 *   room:{roomId}:participants — Hash  { [socketId]: JSON({ userId, username, role }) }
 *
 * Both keys share the same TTL (ROOM_TTL_SECONDS). The TTL is refreshed on
 * every write so rooms with active participants never expire.
 */

import { redisClient } from '../database/redis.js';

/** How long (in seconds) a room's Redis keys persist without any activity. */
const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const stateKey = (roomId) => `room:${roomId}:state`;
const participantsKey = (roomId) => `room:${roomId}:participants`;

/** Refresh TTL on both keys for the given room. */
const touch = async (roomId) => {
  await Promise.all([
    redisClient.expire(stateKey(roomId), ROOM_TTL_SECONDS),
    redisClient.expire(participantsKey(roomId), ROOM_TTL_SECONDS),
  ]);
};

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/**
 * Initialize or reset playback state for a room.
 * @param {string} roomId
 * @param {{ videoId?: string, currentTime?: number, isPlaying?: boolean }} [initial]
 * @returns {Promise<object>}
 */
export const initRoomState = async (roomId, initial = {}) => {
  const state = {
    videoId: initial.videoId || '',
    currentTime: String(initial.currentTime || 0),
    isPlaying: String(initial.isPlaying || false),
    lastUpdated: String(Date.now()),
  };

  await redisClient.hset(stateKey(roomId), state);
  await touch(roomId);

  return deserializeState(state);
};

/**
 * Get playback state for a room. Returns null if the room has no state yet.
 * @param {string} roomId
 * @returns {Promise<object|null>}
 */
export const getRoomState = async (roomId) => {
  const raw = await redisClient.hgetall(stateKey(roomId));
  if (!raw || Object.keys(raw).length === 0) return null;
  return deserializeState(raw);
};

/**
 * Get or create playback state for a room.
 * @param {string} roomId
 * @returns {Promise<object>}
 */
export const getOrCreateRoomState = async (roomId) => {
  const existing = await getRoomState(roomId);
  if (existing) return existing;
  return initRoomState(roomId);
};

/**
 * Update playback fields in room state.
 * @param {string} roomId
 * @param {Partial<{ videoId: string, currentTime: number, isPlaying: boolean }>} update
 * @returns {Promise<object|null>}
 */
export const updateRoomState = async (roomId, update) => {
  const exists = await redisClient.exists(stateKey(roomId));
  if (!exists) return null;

  const serialized = {};
  if (update.videoId !== undefined) serialized.videoId = update.videoId;
  if (update.currentTime !== undefined) serialized.currentTime = String(update.currentTime);
  if (update.isPlaying !== undefined) serialized.isPlaying = String(update.isPlaying);
  serialized.lastUpdated = String(Date.now());

  await redisClient.hset(stateKey(roomId), serialized);
  await touch(roomId);

  return getRoomState(roomId);
};

// ---------------------------------------------------------------------------
// Participant helpers
// ---------------------------------------------------------------------------

/**
 * Add a socket participant to the room's participant set.
 * @param {string} roomId
 * @param {string} socketId
 * @param {{ userId: string, username: string, role: string }} info
 */
export const addSocketParticipant = async (roomId, socketId, info) => {
  // Ensure playback state exists so both keys always appear together
  await getOrCreateRoomState(roomId);

  await redisClient.hset(participantsKey(roomId), socketId, JSON.stringify(info));
  await touch(roomId);
};

/**
 * Remove a socket participant from all rooms it belongs to.
 * Returns the list of roomIds from which the socket was removed.
 * @param {string} socketId
 * @returns {Promise<string[]>}
 */
export const removeSocketFromAllRooms = async (socketId) => {
  // Scan for all participant hashes containing this socketId
  const affectedRooms = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', 'room:*:participants', 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      const exists = await redisClient.hexists(key, socketId);
      if (exists) {
        await redisClient.hdel(key, socketId);

        // Extract roomId from "room:{roomId}:participants"
        const roomId = key.split(':').slice(1, -1).join(':');
        affectedRooms.push(roomId);

        // Clean up room keys entirely if no participants remain
        const remaining = await redisClient.hlen(key);
        if (remaining === 0) {
          await deleteRoomState(roomId);
        }
      }
    }
  } while (cursor !== '0');

  return affectedRooms;
};

/**
 * Get info of a specific socket participant within a room.
 * @param {string} roomId
 * @param {string} socketId
 * @returns {Promise<{ userId, username, role }|null>}
 */
export const getSocketParticipant = async (roomId, socketId) => {
  const raw = await redisClient.hget(participantsKey(roomId), socketId);
  if (!raw) return null;
  return JSON.parse(raw);
};

/**
 * Update the role of all sockets belonging to a userId within a room.
 * Used by assign-role and transfer-host to avoid direct Map iteration.
 * @param {string} roomId
 * @param {string} userId
 * @param {string} role
 */
export const updateParticipantRole = async (roomId, userId, role) => {
  const all = await redisClient.hgetall(participantsKey(roomId));
  if (!all) return;

  const updates = {};
  for (const [socketId, rawInfo] of Object.entries(all)) {
    const info = JSON.parse(rawInfo);
    if (info.userId === userId) {
      updates[socketId] = JSON.stringify({ ...info, role });
    }
  }

  if (Object.keys(updates).length > 0) {
    await redisClient.hset(participantsKey(roomId), updates);
    await touch(roomId);
  }
};

/**
 * Remove all socket participants belonging to a userId from a room.
 * Returns the socketIds that were removed (so callers can emit targeted events).
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export const removeUserSockets = async (roomId, userId) => {
  const all = await redisClient.hgetall(participantsKey(roomId));
  if (!all) return [];

  const toRemove = [];
  for (const [socketId, rawInfo] of Object.entries(all)) {
    const info = JSON.parse(rawInfo);
    if (info.userId === userId) toRemove.push(socketId);
  }

  if (toRemove.length > 0) {
    await redisClient.hdel(participantsKey(roomId), ...toRemove);
    await touch(roomId);
  }

  return toRemove;
};

/**
 * Get a serialisable list of all participants (for broadcasting).
 * @param {string} roomId
 * @returns {Promise<Array<{ socketId, userId, username, role }>>}
 */
export const getParticipantsList = async (roomId) => {
  const all = await redisClient.hgetall(participantsKey(roomId));
  if (!all) return [];
  return Object.entries(all).map(([socketId, rawInfo]) => ({
    socketId,
    ...JSON.parse(rawInfo),
  }));
};

/**
 * Remove a single socket from a specific room's participant set.
 * Cleans up the room keys entirely if no participants remain.
 * @param {string} roomId
 * @param {string} socketId
 */
export const removeSocketFromRoom = async (roomId, socketId) => {
  const key = participantsKey(roomId);
  await redisClient.hdel(key, socketId);

  const remaining = await redisClient.hlen(key);
  if (remaining === 0) {
    await deleteRoomState(roomId);
  }
};

/**
 * Delete all Redis keys for a room.
 * @param {string} roomId
 */
export const deleteRoomState = async (roomId) => {
  await redisClient.del(stateKey(roomId), participantsKey(roomId));
};

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/** Convert raw Redis string fields back to typed values. */
const deserializeState = (raw) => ({
  videoId: raw.videoId || '',
  currentTime: parseFloat(raw.currentTime) || 0,
  isPlaying: raw.isPlaying === 'true',
  lastUpdated: parseInt(raw.lastUpdated, 10) || 0,
});
