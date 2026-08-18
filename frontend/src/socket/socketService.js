import { io } from 'socket.io-client';

export const normalizeSocketUrl = (value) => {
  const raw = (value || '').trim().replace(/\/+$/, '');

  if (!raw) return 'http://localhost:5000';
  if (raw === 'http://localhost' || raw === 'http://localhost/') {
    return 'http://localhost:5000';
  }
  if (raw === 'http://localhost/api') {
    return 'http://localhost:5000';
  }

  return raw;
};

const SOCKET_URL = normalizeSocketUrl(import.meta.env?.VITE_SOCKET_URL);

let socket = null;

/**
 * Initialize and connect the Socket.IO client.
 * The browser sends the HTTP-only auth cookie automatically.
 * @returns {import('socket.io-client').Socket}
 */
export const connectSocket = () => {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  return socket;
};

/**
 * Get the current socket instance.
 * @returns {import('socket.io-client').Socket|null}
 */
export const getSocket = () => socket;

/**
 * Disconnect and nullify the socket.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Emit a socket event safely (no-op if socket is not connected).
 * @param {string} event
 * @param {object} data
 */
export const emitEvent = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
};
