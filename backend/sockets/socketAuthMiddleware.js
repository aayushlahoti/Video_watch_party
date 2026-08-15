import cookieParser from 'cookie-parser';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { config } from '../config/config.js';
import { getCookieNames } from '../services/authService.js';

const parseSignedCookies = (cookieHeader) => {
  const req = { headers: { cookie: cookieHeader } };
  const res = {};
  cookieParser(config.cookie.secret)(req, res, () => {});
  return req.signedCookies || {};
};

/**
 * Socket.IO authentication middleware.
 * Reads the JWT from the socket handshake auth object, Authorization header, or signed cookie.
 * Attaches the authenticated user and their room role to socket.data.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token && socket.handshake.headers?.cookie) {
      const signedCookies = parseSignedCookies(socket.handshake.headers.cookie);
      const { accessToken } = getCookieNames();
      token = signedCookies[accessToken] || signedCookies.token;
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided.'));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found.'));
    }

    socket.data.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    };
    socket.data.token = token;

    const revalidateInterval = setInterval(() => {
      try {
        verifyToken(socket.data.token);
      } catch {
        socket.emit('auth:error', { message: 'Your session has expired.' });
        socket.disconnect(true);
      }
    }, 30000);

    socket.data.revalidateInterval = revalidateInterval;
    socket.on('disconnect', () => {
      if (socket.data.revalidateInterval) {
        clearInterval(socket.data.revalidateInterval);
      }
    });

    return next();
  } catch {
    return next(new Error('Authentication error: Invalid or expired token.'));
  }
};

/**
 * Resolve the role of a user within a specific room.
 * Returns null if the user is not a participant.
 * @param {string} roomId
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export const resolveUserRole = async (roomId, userId) => {
  const room = await Room.findById(roomId).select('participants host');
  if (!room) return null;

  const participant = room.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  return participant ? participant.role : null;
};
