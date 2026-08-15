import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getSocket } from '../socket/socketService.js';

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomState, setRoomState] = useState({
    videoId: '',
    currentTime: 0,
    isPlaying: false,
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const playerRef = useRef(null); // YouTube player instance

  const setPlayerRef = useCallback((player) => {
    playerRef.current = player;
  }, []);

  const updateRoomState = useCallback((update) => {
    setRoomState((prev) => ({ ...prev, ...update }));
  }, []);

  const clearRoom = useCallback(() => {
    setRoom(null);
    setParticipants([]);
    setRoomState({ videoId: '', currentTime: 0, isPlaying: false });
    setConnectionStatus('disconnected');
  }, []);

  // Emit helpers — so components don't need to import socketService
  const emitPlay = useCallback((roomId, currentTime) => {
    const socket = getSocket();
    if (socket) socket.emit('play', { roomId, currentTime });
  }, []);

  const emitPause = useCallback((roomId, currentTime) => {
    const socket = getSocket();
    if (socket) socket.emit('pause', { roomId, currentTime });
  }, []);

  const emitSeek = useCallback((roomId, currentTime) => {
    const socket = getSocket();
    if (socket) socket.emit('seek', { roomId, currentTime });
  }, []);

  const emitChangeVideo = useCallback((roomId, videoId) => {
    const socket = getSocket();
    if (socket) socket.emit('change-video', { roomId, videoId });
  }, []);

  const value = {
    room,
    setRoom,
    participants,
    setParticipants,
    roomState,
    updateRoomState,
    connectionStatus,
    setConnectionStatus,
    playerRef,
    setPlayerRef,
    clearRoom,
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeVideo,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within a RoomProvider');
  return context;
};
