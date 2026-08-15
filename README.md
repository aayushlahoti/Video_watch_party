# Watch Party

**Watch Party** is a production-grade, real-time web application that allows multiple users to watch YouTube videos together in synchronized harmony. Whenever a host or moderator plays, pauses, seeks, or changes the video, every participant in the room sees the action instantly.

---

## Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Real-Time Client**: Socket.IO Client
- **Styling**: Vanilla CSS Modules with custom Design System Tokens

### Backend
- **Runtime**: Node.js & Express.js
- **Real-Time Server**: Socket.IO
- **Authentication**: JWT & bcrypt with HTTP-only signed cookies
- **Security**: Helmet, CORS, Express Rate Limit, Input Sanitization
- **Validation**: express-validator
- **Database**: MongoDB Atlas via Mongoose

---

## Architecture & SOLID Principles

- **Controller-Service-Model Separation**: REST controllers are kept thin and strictly handle HTTP requests/responses. All business logic lives inside `services/`.
- **Decoupled REST & WebSockets**: Socket.IO handlers (`sockets/`) operate independently from Express REST controllers.
- **In-Memory Room State**: Live playback state (`videoId`, `currentTime`, `isPlaying`, connected socket users) is managed in-memory via `roomStateService.js` (swappable for Redis with zero business logic changes).
- **Backend-Enforced Authorization**: Frontend role checks are never trusted. Every privileged action (play, pause, seek, role change, kick) is validated on the backend.

---

## Folder Structure

```
watch-party/
├── backend/
│   ├── config/             # Environment configuration wrapper
│   ├── controllers/        # REST API route handlers
│   ├── database/           # MongoDB connection lifecycle
│   ├── middlewares/        # JWT Auth, Validation, Global Error & 404
│   ├── models/             # Mongoose schemas (User, Room)
│   ├── routes/             # Express API routers (Auth, Rooms)
│   ├── services/           # Business logic & in-memory Room State Service
│   ├── sockets/            # Socket.IO auth middleware & event handlers
│   ├── utils/              # JWT helpers & standardized response formats
│   ├── validators/         # express-validator request rules
│   ├── .env.example        # Backend environment template
│   ├── app.js              # Express app setup & middleware pipeline
│   ├── server.js           # HTTP & Socket.IO server entry point
│   └── Dockerfile          # Backend production container
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Centralized Axios client & API endpoints
│   │   ├── components/     # UI Components (Player, Controls, Participants, Navbar, RoomHeader, RoleBadge, ProtectedRoute)
│   │   ├── context/        # React AuthContext & RoomContext
│   │   ├── hooks/          # Custom hooks (useRoomSocket)
│   │   ├── pages/          # Home, Login, Register, CreateRoom, JoinRoom, Room
│   │   ├── socket/         # Singleton Socket.IO service client
│   │   └── styles/         # Global design system tokens & styles
│   ├── .env.example        # Frontend environment template
│   ├── Dockerfile          # Multi-stage Nginx production container
│   ├── index.html
│   └── vite.config.js
│
├── docker-compose.yml       # Container orchestration configuration
├── .gitignore              # Ignored files (node_modules, .env, dist, etc.)
└── README.md               # Project documentation
```

---

## Environment Variables

### Backend `.env` (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/watch-party
JWT_SECRET=replace_with_secure_jwt_secret
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
NODE_ENV=development
COOKIE_SECRET=replace_with_secure_cookie_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend `.env` (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_YOUTUBE_API_KEY=replace_with_youtube_api_key_if_needed
```

---

## Getting Started

### 1. Local Development Setup

#### Step A: Backend
```bash
cd backend
npm install
npm run dev
```

#### Step B: Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### 2. Docker Deployment

To build and run the entire application using Docker Compose:

```bash
docker-compose up --build
```

Access the application at `http://localhost:8080`.

---

## REST API Specification

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate and obtain JWT
- `POST /api/auth/logout` - Clear authentication cookie
- `GET /api/auth/profile` - Fetch current user profile *(Protected)*

### Rooms
- `POST /api/rooms` - Create a new room (User becomes Host) *(Protected)*
- `POST /api/rooms/:id/join` - Join room as a participant *(Protected)*
- `POST /api/rooms/:id/leave` - Leave current room *(Protected)*
- `GET /api/rooms/:id` - Get room details *(Protected)*

### Host Actions
- `PATCH /api/rooms/:id/role` - Assign Moderator/Participant role *(Host Only)*
- `PATCH /api/rooms/:id/transfer` - Transfer Host privileges *(Host Only)*
- `DELETE /api/rooms/:id/member` - Remove a participant from the room *(Host/Moderator)*

---

## Real-Time Socket Events

| Event | Direction | Payload / Action |
|---|---|---|
| `join-room` | Client → Server | `{ roomId }` |
| `leave-room` | Client → Server | `{ roomId }` |
| `play` | Client → Server | `{ roomId, currentTime }` *(Privileged)* |
| `pause` | Client → Server | `{ roomId, currentTime }` *(Privileged)* |
| `seek` | Client → Server | `{ roomId, currentTime }` *(Privileged)* |
| `change-video` | Client → Server | `{ roomId, videoId }` *(Privileged)* |
| `assign-role` | Client → Server | `{ roomId, targetUserId, role }` *(Host Only)* |
| `transfer-host` | Client → Server | `{ roomId, targetUserId }` *(Host Only)* |
| `remove-user` | Client → Server | `{ roomId, targetUserId }` *(Host/Mod Only)* |
| `user-joined` | Server → Client | Broadcast updated participant list |
| `user-left` | Server → Client | Broadcast updated participant list |
| `video-play` | Server → Client | Synchronize video play |
| `video-pause` | Server → Client | Synchronize video pause |
| `video-seek` | Server → Client | Synchronize video seek timestamp |
| `video-change` | Server → Client | Load new YouTube video ID |
| `role-updated` | Server → Client | Broadcast updated user roles |
| `host-transferred`| Server → Client | Broadcast new host assignment |
| `participant-removed`| Server → Client | Disconnect target user & update list |

---

## Future Improvements

1. **Redis Pub/Sub & Caching**: Replace the current in-memory room state service (`roomStateService.js`) with Redis for multi-instance backend scaling.
2. **Text Chat & Reactions**: Add real-time chat and floating emoji reactions per room.
3. **Video Queue / Playlist**: Allow hosts and moderators to queue multiple YouTube videos for continuous playback.
4. **WebRTC Voice Chat**: Peer-to-peer audio channels so participants can talk while watching.
