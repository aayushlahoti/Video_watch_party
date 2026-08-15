import { useEffect, useRef } from 'react';
import { getSocket } from '../socket/socketService.js';
import { useRoom } from '../context/RoomContext.jsx';

/**
 * Hook that registers all Socket.IO event listeners for a room.
 * Automatically cleans up listeners on unmount.
 *
 * @param {string|null} roomId - The current room's MongoDB ID
 * @param {string|null} userId - The current user's ID (to ignore own events)
 */
export const useRoomSocket = (roomId, userId) => {
  const {
    setParticipants,
    updateRoomState,
    setConnectionStatus,
    playerRef,
  } = useRoom();

  const playerRefLocal = playerRef;
  const ignoreNextRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    setConnectionStatus('connecting');

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onConnectError = () => setConnectionStatus('disconnected');

    const onRoomState = ({ videoId, currentTime, isPlaying, participants }) => {
      updateRoomState({ videoId, currentTime, isPlaying });
      if (participants) setParticipants(participants);

      // Sync the player to the current state
      const player = playerRefLocal.current;
      if (player && videoId) {
        player.loadVideoById({ videoId, startSeconds: currentTime });
        if (!isPlaying) {
          setTimeout(() => player.pauseVideo?.(), 500);
        }
      }
    };

    const onUserJoined = ({ participants }) => {
      if (participants) setParticipants(participants);
    };

    const onUserLeft = ({ participants }) => {
      if (participants) setParticipants(participants);
    };

    const onVideoPlay = ({ currentTime }) => {
      updateRoomState({ isPlaying: true, currentTime });
      const player = playerRefLocal.current;
      if (player) {
        player.seekTo?.(currentTime, true);
        player.playVideo?.();
      }
    };

    const onVideoPause = ({ currentTime }) => {
      updateRoomState({ isPlaying: false, currentTime });
      const player = playerRefLocal.current;
      if (player) {
        player.seekTo?.(currentTime, true);
        player.pauseVideo?.();
      }
    };

    const onVideoSeek = ({ currentTime }) => {
      updateRoomState({ currentTime });
      const player = playerRefLocal.current;
      if (player) {
        player.seekTo?.(currentTime, true);
      }
    };

    const onVideoChange = ({ videoId }) => {
      updateRoomState({ videoId, currentTime: 0, isPlaying: false });
      const player = playerRefLocal.current;
      if (player) {
        player.loadVideoById({ videoId, startSeconds: 0 });
        setTimeout(() => player.pauseVideo?.(), 500);
      }
    };

    const onRoleUpdated = ({ participants }) => {
      if (participants) setParticipants(participants);
    };

    const onHostTransferred = ({ participants }) => {
      if (participants) setParticipants(participants);
    };

    const onParticipantRemoved = ({ participants }) => {
      if (participants) setParticipants(participants);
    };

    const onError = ({ message }) => {
      console.error('Socket error:', message);
    };

    // Connection events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Room events
    socket.on('room-state', onRoomState);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('video-play', onVideoPlay);
    socket.on('video-pause', onVideoPause);
    socket.on('video-seek', onVideoSeek);
    socket.on('video-change', onVideoChange);
    socket.on('role-updated', onRoleUpdated);
    socket.on('host-transferred', onHostTransferred);
    socket.on('participant-removed', onParticipantRemoved);
    socket.on('error', onError);

    if (socket.connected) setConnectionStatus('connected');

    // Emit join-room to subscribe to the room
    socket.emit('join-room', { roomId });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room-state', onRoomState);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('video-play', onVideoPlay);
      socket.off('video-pause', onVideoPause);
      socket.off('video-seek', onVideoSeek);
      socket.off('video-change', onVideoChange);
      socket.off('role-updated', onRoleUpdated);
      socket.off('host-transferred', onHostTransferred);
      socket.off('participant-removed', onParticipantRemoved);
      socket.off('error', onError);
      socket.emit('leave-room', { roomId });
    };
  }, [roomId, userId, setParticipants, updateRoomState, setConnectionStatus, playerRefLocal]);

  return { ignoreNextRef };
};
