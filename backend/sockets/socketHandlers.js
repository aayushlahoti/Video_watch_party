import {
  getOrCreateRoomState,
  getRoomState,
  updateRoomState,
  addSocketParticipant,
  removeSocketFromAllRooms,
  removeSocketFromRoom,
  getSocketParticipant,
  getParticipantsList,
  updateParticipantRole,
  removeUserSockets,
} from '../services/roomStateService.js';
import { resolveUserRole } from './socketAuthMiddleware.js';
import Room from '../models/Room.js';

/**
 * Determines if a role is privileged (host or moderator).
 * @param {string} role
 * @returns {boolean}
 */
const isPrivileged = (role) => ['host', 'moderator'].includes(role);

/**
 * Registers all real-time event handlers on the given socket.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
const registerSocketHandlers = (socket, io) => {
  const { user } = socket.data;

  /**
   * join-room
   * Client sends: { roomId }
   * Server emits to room: user-joined (broadcast to others)
   * Server emits to sender: the current room state
   */
  socket.on('join-room', async ({ roomId } = {}) => {
    try {
      if (!roomId) return socket.emit('error', { message: 'roomId is required' });

      // Verify the user is a DB participant
      const role = await resolveUserRole(roomId, user.id);
      if (!role) {
        return socket.emit('error', { message: 'You are not a participant of this room.' });
      }

      await socket.join(roomId);

      await addSocketParticipant(roomId, socket.id, {
        userId: user.id,
        username: user.username,
        role,
      });

      const state = await getOrCreateRoomState(roomId);

      // Notify everyone else in the room
      socket.to(roomId).emit('user-joined', {
        userId: user.id,
        username: user.username,
        role,
        participants: await getParticipantsList(roomId),
      });

      // Send current state only to the joining socket
      socket.emit('room-state', {
        roomId,
        videoId: state.videoId,
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
        participants: await getParticipantsList(roomId),
      });
    } catch (err) {
      console.error('join-room error:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  /**
   * leave-room
   * Client sends: { roomId }
   */
  socket.on('leave-room', ({ roomId } = {}) => {
    if (!roomId) return;
    handleLeave(socket, io, roomId, user);
  });

  /**
   * play
   * Client sends: { roomId, currentTime }
   * Only host or moderator can broadcast play.
   */
  socket.on('play', async ({ roomId, currentTime } = {}) => {
    try {
      if (!roomId) return socket.emit('error', { message: 'roomId is required' });

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || !isPrivileged(participant.role)) {
        return socket.emit('error', { message: 'Permission denied: only host/moderator can play.' });
      }

      await updateRoomState(roomId, { isPlaying: true, currentTime: currentTime ?? 0 });

      socket.to(roomId).emit('video-play', {
        userId: user.id,
        username: user.username,
        currentTime: currentTime ?? 0,
      });
    } catch (err) {
      console.error('play error:', err);
      socket.emit('error', { message: 'Failed to broadcast play.' });
    }
  });

  /**
   * pause
   * Client sends: { roomId, currentTime }
   * Only host or moderator can broadcast pause.
   */
  socket.on('pause', async ({ roomId, currentTime } = {}) => {
    try {
      if (!roomId) return socket.emit('error', { message: 'roomId is required' });

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || !isPrivileged(participant.role)) {
        return socket.emit('error', { message: 'Permission denied: only host/moderator can pause.' });
      }

      await updateRoomState(roomId, { isPlaying: false, currentTime: currentTime ?? 0 });

      socket.to(roomId).emit('video-pause', {
        userId: user.id,
        username: user.username,
        currentTime: currentTime ?? 0,
      });
    } catch (err) {
      console.error('pause error:', err);
      socket.emit('error', { message: 'Failed to broadcast pause.' });
    }
  });

  /**
   * seek
   * Client sends: { roomId, currentTime }
   * Only host or moderator can broadcast seek.
   */
  socket.on('seek', async ({ roomId, currentTime } = {}) => {
    try {
      if (!roomId) return socket.emit('error', { message: 'roomId is required' });

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || !isPrivileged(participant.role)) {
        return socket.emit('error', { message: 'Permission denied: only host/moderator can seek.' });
      }

      await updateRoomState(roomId, { currentTime: currentTime ?? 0 });

      socket.to(roomId).emit('video-seek', {
        userId: user.id,
        username: user.username,
        currentTime: currentTime ?? 0,
      });
    } catch (err) {
      console.error('seek error:', err);
      socket.emit('error', { message: 'Failed to broadcast seek.' });
    }
  });

  /**
   * change-video
   * Client sends: { roomId, videoId }
   * Only host or moderator can change the video.
   */
  socket.on('change-video', async ({ roomId, videoId } = {}) => {
    try {
      if (!roomId || !videoId) {
        return socket.emit('error', { message: 'roomId and videoId are required' });
      }

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || !isPrivileged(participant.role)) {
        return socket.emit('error', { message: 'Permission denied: only host/moderator can change video.' });
      }

      await updateRoomState(roomId, { videoId, currentTime: 0, isPlaying: false });

      io.to(roomId).emit('video-change', {
        userId: user.id,
        username: user.username,
        videoId,
      });
    } catch (err) {
      console.error('change-video error:', err);
      socket.emit('error', { message: 'Failed to broadcast video change.' });
    }
  });

  /**
   * assign-role
   * Client sends: { roomId, targetUserId, role }
   * Only host can assign roles via socket.
   */
  socket.on('assign-role', async ({ roomId, targetUserId, role } = {}) => {
    try {
      if (!roomId || !targetUserId || !role) {
        return socket.emit('error', { message: 'roomId, targetUserId, and role are required.' });
      }

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || participant.role !== 'host') {
        return socket.emit('error', { message: 'Permission denied: only host can assign roles.' });
      }

      // Update DB
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found.' });

      const target = room.participants.find((p) => p.userId.toString() === targetUserId);
      if (!target) return socket.emit('error', { message: 'Target user not in room.' });

      target.role = role;
      await room.save();

      // Update Redis participant entries for all active sockets of that user
      await updateParticipantRole(roomId, targetUserId, role);

      io.to(roomId).emit('role-updated', {
        targetUserId,
        role,
        participants: await getParticipantsList(roomId),
      });
    } catch (err) {
      console.error('assign-role error:', err);
      socket.emit('error', { message: 'Failed to assign role.' });
    }
  });

  /**
   * transfer-host
   * Client sends: { roomId, targetUserId }
   */
  socket.on('transfer-host', async ({ roomId, targetUserId } = {}) => {
    try {
      if (!roomId || !targetUserId) {
        return socket.emit('error', { message: 'roomId and targetUserId are required.' });
      }

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || participant.role !== 'host') {
        return socket.emit('error', { message: 'Permission denied: only host can transfer host.' });
      }

      // Update DB
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found.' });

      const currentHostParticipant = room.participants.find(
        (p) => p.userId.toString() === user.id
      );
      const newHostParticipant = room.participants.find(
        (p) => p.userId.toString() === targetUserId
      );
      if (!newHostParticipant) return socket.emit('error', { message: 'Target user not in room.' });

      if (currentHostParticipant) currentHostParticipant.role = 'participant';
      newHostParticipant.role = 'host';
      room.host = targetUserId;
      await room.save();

      // Update Redis participant entries for both users
      await updateParticipantRole(roomId, user.id, 'participant');
      await updateParticipantRole(roomId, targetUserId, 'host');

      io.to(roomId).emit('host-transferred', {
        newHostId: targetUserId,
        previousHostId: user.id,
        participants: await getParticipantsList(roomId),
      });
    } catch (err) {
      console.error('transfer-host error:', err);
      socket.emit('error', { message: 'Failed to transfer host.' });
    }
  });

  /**
   * remove-user
   * Client sends: { roomId, targetUserId }
   */
  socket.on('remove-user', async ({ roomId, targetUserId } = {}) => {
    try {
      if (!roomId || !targetUserId) {
        return socket.emit('error', { message: 'roomId and targetUserId are required.' });
      }

      const participant = await getSocketParticipant(roomId, socket.id);
      if (!participant || !isPrivileged(participant.role)) {
        return socket.emit('error', { message: 'Permission denied: only host/moderator can remove users.' });
      }

      // Update DB
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found.' });

      if (room.host.toString() === targetUserId) {
        return socket.emit('error', { message: 'Cannot remove the host.' });
      }

      room.participants = room.participants.filter(
        (p) => p.userId.toString() !== targetUserId
      );
      await room.save();

      // Remove participant entries from Redis and collect their socketIds
      const removedSocketIds = await removeUserSockets(roomId, targetUserId);

      // Notify and eject each removed socket.
      // Using io.to(sid) routes through the Redis adapter so this works
      // even if the target socket is connected to a different backend instance.
      for (const sid of removedSocketIds) {
        io.to(sid).emit('participant-removed', { reason: 'You have been removed from the room.' });
        // Ask all nodes to make that socket leave the Socket.IO room
        await io.in(sid).socketsLeave(roomId);
      }

      io.to(roomId).emit('participant-removed', {
        removedUserId: targetUserId,
        participants: await getParticipantsList(roomId),
      });
    } catch (err) {
      console.error('remove-user error:', err);
      socket.emit('error', { message: 'Failed to remove user.' });
    }
  });

  /**
   * Handle disconnect — same as leave-room for all joined rooms.
   */
  socket.on('disconnect', async () => {
    try {
      const rooms = await removeSocketFromAllRooms(socket.id);
      for (const roomId of rooms) {
        io.to(roomId).emit('user-left', {
          userId: user.id,
          username: user.username,
          participants: await getParticipantsList(roomId),
        });
      }
    } catch (err) {
      console.error('disconnect cleanup error:', err);
    }
  });
};

/**
 * Helper: handle a user leaving a specific room.
 */
const handleLeave = async (socket, io, roomId, user) => {
  socket.leave(roomId);
  await removeSocketFromRoom(roomId, socket.id);

  io.to(roomId).emit('user-left', {
    userId: user.id,
    username: user.username,
    participants: await getParticipantsList(roomId),
  });
};

export default registerSocketHandlers;
