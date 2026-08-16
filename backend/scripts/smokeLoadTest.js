import axios from 'axios';
import { io } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const NUM_PARTICIPANTS = parseInt(process.env.NUM_PARTICIPANTS || '3', 10);
const PASSWORD = 'TestPass123!';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const extractCookieHeader = (setCookieHeaders, cookieName) => {
  if (!setCookieHeaders) return null;
  const cookie = setCookieHeaders
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith(`${cookieName}=`));
  return cookie || null;
};

const registerUserAndGetCookie = async (username, email) => {
  const res = await axios.post(`${BASE_URL}/api/auth/register`, { username, email, password: PASSWORD }, { validateStatus: () => true });
  if (res.status >= 400) {
    // try login in case user exists
    const login = await axios.post(`${BASE_URL}/api/auth/login`, { email, password: PASSWORD }, { validateStatus: () => true });
    if (login.status >= 400) throw new Error(`Auth failed for ${email}: ${login.status}`);
    const cookie = extractCookieHeader(login.headers['set-cookie'], 'accessToken');
    return cookie;
  }
  const cookie = extractCookieHeader(res.headers['set-cookie'], 'accessToken');
  return cookie;
};

const createRoom = async (cookie) => {
  const res = await axios.post(`${BASE_URL}/api/rooms`, null, { headers: { Cookie: cookie } });
  return res.data?.data?.room?._id;
};

const joinRoomApi = async (roomId, cookie) => {
  const res = await axios.post(`${BASE_URL}/api/rooms/${roomId}/join`, null, { headers: { Cookie: cookie } });
  return res.data;
};

const main = async () => {
  console.log('Starting smoke load test (small scale)');
  // Create host
  const hostEmail = `host+${Date.now()}@example.com`;
  const hostCookie = await registerUserAndGetCookie('host', hostEmail);
  if (!hostCookie) throw new Error('Failed to obtain host cookie');

  // Connect host socket
  const hostSocket = io(BASE_URL, {
    transports: ['websocket'],
    extraHeaders: { Cookie: hostCookie },
    auth: {},
  });

  hostSocket.on('connect', () => console.log('Host socket connected:', hostSocket.id));
  hostSocket.on('connect_error', (err) => console.error('Host connect_error', err.message));

  // Wait for host connected
  await new Promise((res) => hostSocket.once('connect', res));

  // Create room via API
  const roomId = await createRoom(hostCookie);
  console.log('Created room:', roomId);

  // Create participants and connect sockets
  const participants = [];
  for (let i = 0; i < NUM_PARTICIPANTS; i++) {
    const email = `user${i}+${Date.now()}@example.com`;
    const cookie = await registerUserAndGetCookie(`user${i}`, email);
    const socket = io(BASE_URL, { transports: ['websocket'], extraHeaders: { Cookie: cookie }, auth: {} });

    socket.on('connect', () => console.log(`Participant ${i} connected: ${socket.id}`));
    socket.on('error', (e) => console.error(`Participant ${i} error:`, e));
    socket.on('user-joined', (data) => console.log(`Participant ${i} received user-joined`, data?.userId));
    socket.on('room-state', (state) => console.log(`Participant ${i} received room-state:`, state.videoId, state.currentTime, state.isPlaying));
    socket.on('video-play', (d) => console.log(`Participant ${i} video-play at ${d.currentTime}`));
    socket.on('video-pause', (d) => console.log(`Participant ${i} video-pause at ${d.currentTime}`));
    socket.on('video-change', (d) => console.log(`Participant ${i} video-change to ${d.videoId}`));

    await new Promise((res) => socket.once('connect', res));

    // Join room via API
    await joinRoomApi(roomId, cookie);

    // Also emit join-room via socket to ensure server has socket participant
    socket.emit('join-room', { roomId });

    participants.push({ socket, cookie });
  }

  // Wait a bit
  await sleep(1000);

  // Host join through socket
  hostSocket.emit('join-room', { roomId });

  // Wait for joins to propagate
  await sleep(1000);

  // Host changes video
  hostSocket.emit('change-video', { roomId, videoId: 'dQw4w9WgXcQ' });
  await sleep(500);

  // Host plays
  hostSocket.emit('play', { roomId, currentTime: 0 });
  await sleep(500);

  // Host seeks
  hostSocket.emit('seek', { roomId, currentTime: 42 });
  await sleep(500);

  // Host pauses
  hostSocket.emit('pause', { roomId, currentTime: 42 });
  await sleep(500);

  // Assign moderator to first participant via API (host only)
  const targetUserId = (await axios.get(`${BASE_URL}/api/rooms/${roomId}`, { headers: { Cookie: hostCookie } })).data.data.room.participants[0].userId;
  await axios.patch(`${BASE_URL}/api/rooms/${roomId}/role`, { userId: targetUserId, role: 'moderator' }, { headers: { Cookie: hostCookie } });
  console.log('Assigned moderator role');

  await sleep(500);

  // Transfer host to the moderator
  await axios.patch(`${BASE_URL}/api/rooms/${roomId}/transfer`, { userId: targetUserId }, { headers: { Cookie: hostCookie } });
  console.log('Transferred host');

  await sleep(500);

  // Remove second participant (if exists)
  if (participants[1]) {
    const removedUserId = (await axios.get(`${BASE_URL}/api/rooms/${roomId}`, { headers: { Cookie: hostCookie } })).data.data.room.participants[1].userId;
    await axios.delete(`${BASE_URL}/api/rooms/${roomId}/member`, { data: { userId: removedUserId }, headers: { Cookie: hostCookie } });
    console.log('Removed participant 1');
  }

  await sleep(1000);

  // Cleanup
  participants.forEach((p) => p.socket.disconnect());
  hostSocket.disconnect();

  console.log('Smoke load test completed');
};

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
