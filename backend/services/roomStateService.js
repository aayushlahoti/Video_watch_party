/**
 * In-memory room state store.
 *
 * Stores live playback state for each active room.
 * Keys are room IDs (MongoDB ObjectId strings).
 *
 * Structure:
 * {
 *   [roomId]: {
 *     videoId: string,
 *     currentTime: number,
 *     isPlaying: boolean,
 *     lastUpdated: number,       // unix timestamp
 *     socketParticipants: Map<socketId, { userId, username, role }>
 *   }
 * }
 *
 * IMPORTANT: This state is intentionally NOT persisted to MongoDB.
 * It is designed to be swapped for Redis with zero changes to business logic:
 * just replace the exported functions below with Redis equivalents.
 */

const roomStates = new Map();

/**
 * Initialize or reset state for a room.
 * @param {string} roomId
 * @param {object} [initial]
 * @returns {object}
 */
export const initRoomState = (roomId, initial = {}) => {
  const state = {
    videoId: initial.videoId || '',
    currentTime: initial.currentTime || 0,
    isPlaying: initial.isPlaying || false,
    lastUpdated: Date.now(),
    socketParticipants: new Map(), // socketId -> { userId, username, role }
  };
  roomStates.set(roomId, state);
  return state;
};

/**
 * Get state for a room. Returns null if the room has no state yet.
 * @param {string} roomId
 * @returns {object|null}
 */
export const getRoomState = (roomId) => {
  return roomStates.get(roomId) || null;
};

/**
 * Get or create state for a room.
 * @param {string} roomId
 * @returns {object}
 */
export const getOrCreateRoomState = (roomId) => {
  if (!roomStates.has(roomId)) {
    return initRoomState(roomId);
  }
  return roomStates.get(roomId);
};

/**
 * Update playback fields in room state.
 * @param {string} roomId
 * @param {Partial<{videoId, currentTime, isPlaying}>} update
 * @returns {object|null}
 */
export const updateRoomState = (roomId, update) => {
  const state = roomStates.get(roomId);
  if (!state) return null;

  Object.assign(state, update, { lastUpdated: Date.now() });
  return state;
};

/**
 * Add a socket participant to the room state.
 * @param {string} roomId
 * @param {string} socketId
 * @param {{ userId: string, username: string, role: string }} info
 */
export const addSocketParticipant = (roomId, socketId, info) => {
  const state = getOrCreateRoomState(roomId);
  state.socketParticipants.set(socketId, info);
};

/**
 * Remove a socket participant from all room states they belong to.
 * Returns an array of roomIds from which the socket was removed.
 * @param {string} socketId
 * @returns {string[]}
 */
export const removeSocketFromAllRooms = (socketId) => {
  const affectedRooms = [];
  for (const [roomId, state] of roomStates.entries()) {
    if (state.socketParticipants.has(socketId)) {
      state.socketParticipants.delete(socketId);
      affectedRooms.push(roomId);

      // Clean up room state if no sockets remain
      if (state.socketParticipants.size === 0) {
        roomStates.delete(roomId);
      }
    }
  }
  return affectedRooms;
};

/**
 * Get the info of a socket participant within a specific room.
 * @param {string} roomId
 * @param {string} socketId
 * @returns {{ userId, username, role }|null}
 */
export const getSocketParticipant = (roomId, socketId) => {
  const state = roomStates.get(roomId);
  if (!state) return null;
  return state.socketParticipants.get(socketId) || null;
};

/**
 * Get a serializable snapshot of socket participants (for broadcasting).
 * @param {string} roomId
 * @returns {Array<{ socketId, userId, username, role }>}
 */
export const getParticipantsList = (roomId) => {
  const state = roomStates.get(roomId);
  if (!state) return [];
  return Array.from(state.socketParticipants.entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
  }));
};

/**
 * Delete a room's state entirely.
 * @param {string} roomId
 */
export const deleteRoomState = (roomId) => {
  roomStates.delete(roomId);
};
