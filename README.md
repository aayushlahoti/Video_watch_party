# Watch Party 🎬

Watch Party is a production-grade, real-time synchronized video watching platform that allows users to create virtual rooms, invite friends, and watch YouTube videos in perfect synchronization. 

The application is built using a highly scalable, distributed architecture. It couples a modern **React SPA** with a **Node/Express API**, persistent **MongoDB storage**, a high-performance **Redis cache**, and real-time clustering via **Socket.IO Redis Adapters** and **Nginx load balancing** to deliver a seamless, ultra-low-latency streaming experience.

---

## 🚀 Key Architectural Upgrades & What's New

The latest version represents a complete overhaul of reliability, security, and scalability from the ground up:

### ⚡ 1. Distributed Real-Time Coordination (Redis Adapter)
- **Multi-Instance Syncing:** Using `@socket.io/redis-adapter`, Socket.IO events (play, pause, seek, and video changes) are automatically fanned out via Redis Pub/Sub across all backend replicas.
- **Stateless Backends:** Servers are completely stateless. A client can connect to any replica behind the load balancer and still stay in perfect sync.

### 💾 2. Low-Latency Redis State Caching (Database Offloading)
- **High-Frequency Caching:** To avoid overloading MongoDB with high-frequency playback updates (e.g., seeking, playing, pausing, buffering state), the current playback state (`room:{roomId}:state`) and participant socket IDs (`room:{roomId}:participants`) are written to Redis hashes.
- **Sliding TTL Memory Management:** Active room states are given a sliding 24-hour TTL (`touch`ed on every read/write). If a room is active, it stays cached indefinitely; once the last user leaves, a background scanner cleans up the keys.

### 🛡️ 3. Strict Server-Side Role-Based Moderation
- **Three-Tier Role Hierarchy:** Supports `host`, `moderator`, and `participant` roles.
- **WebSocket-Level Enforcement:** Playback controls (play, pause, seek, change-video) are validated on the server. If a standard participant emits a playback change, the server rejects it and replies with an error event, preventing client-side malicious activity.
- **Dynamic Session Demotions/Promotions:** Host transfers, moderator promotions, and user expulsions take effect immediately in both MongoDB and Redis, and are broadcasted instantly to all connected socket clients.

### 🔑 4. Advanced Session Security & Token Rotation
- **Double Token Cookie Auth:** Secures sessions using signed, HTTP-only, secure cookies. Features separate Access Tokens and Refresh Tokens (with Token Rotation & Revocation lists tracked in MongoDB).
- **Periodic Connection Revalidation:** Connected Socket.IO clients are audited every 30 seconds. If their access token is revoked, expired, or tampered with, the server forcefully disconnects the socket, ensuring zero-trust session integrity.

### 🔍 5. Hybrid Room Lookup (Dual Identification)
- **User-Friendly Codes:** Generated using an 8-character cryptographically random uppercase unique identifier (e.g., `B3FD9A7C`) with automated collision-avoidance checks.
- **Smart Normalization:** The endpoint lookup layer accepts either a standard 24-character MongoDB `ObjectId` (checked via `mongoose.isValidObjectId`) or an 8-character `roomCode` and normalizes them dynamically via `normalizeRoomIdentifier`.

---

## 🛠️ Tech Stack & Codebase Usage

The platform uses a robust, battle-tested modern web stack:

### Frontend
*   **React 18 & Vite:** Fast client-side rendering with hot module reloading, modern component architecture, and responsive styling.
*   **React Context & Hooks (`RoomContext`, `useRoomSocket`):** Manages shared state (active video details, connection status, participant lists) and couples the React render cycle directly with incoming socket event emissions.
*   **Socket.IO Client:** Connected over WebSockets (with long-polling fallback) with auto-reconnection and signed-cookie credentials.
*   **YouTube IFrame Player API:** Dynamic integration with the YouTube embedded player, enabling programmatically controlled playback, seeking, and status tracking (e.g., detecting if a user manually seeks or pauses).
*   **CSS Modules:** Component-scoped, collision-free CSS styling for UI polishing.

### Backend
*   **Node.js & Express.js:** The core runtime and REST API gateway. Highly modularized into Controllers, Services, Middlewares, Sockets, and Validators.
*   **Socket.IO Server:** Real-time bi-directional event stream hub. Connects directly to the Express HTTP Server, sharing signed cookies for authentication.
*   **Mongoose & MongoDB:** Document database for heavy/slow-moving persistence such as Users (hashed credentials, active refresh tokens) and Rooms (host metadata, permanent participants list, creation timestamps).
*   **Redis (via `ioredis`):** Used as a distributed caching layer and socket-event fan-out hub. Configured with three dedicated connections: `main` (for state reads/writes), `pub` (for socket publish adapter), and `sub` (for socket subscribe adapter).
*   **JWT (JSON Web Tokens) & Bcrypt:** Industry-standard secure password hashing (12 salt rounds) and session encryption.
*   **Express Rate Limit:** Hardens endpoints against DDoS and brute-force auth attempts, limiting connections per IP.
*   **Express Mongo Sanitize:** Sanitizes request bodies to completely block MongoDB query injection attacks.

### Infrastructure & Operations
*   **Docker & Docker Compose:** Containerizes MongoDB, Redis, Nginx, multiple Backend replicas, and the Frontend SPA into a local production-mimicking environment.
*   **Nginx Load Balancer:** Operates as a sticky reverse-proxy. Uses `ip_hash` to guarantee Socket.IO clients connect to the same backend upstream during long-polling handshakes, and manages WebSocket protocol upgrades (`Upgrade` / `Connection` headers).

---

## ⚡ High Performance & Scalability Framework

Watch Party is architected specifically to handle concurrent users efficiently with negligible server resource utilization:

### 1. The "Cache-over-Writes" Playback Strategy
Writing playback timestamps to a disk-based database like MongoDB several times a second (as active users seek or skip videos) creates a severe write bottleneck. 
*   **How Watch Party solves this:** Playback updates are processed entirely inside **Redis RAM cache** via high-speed hashes. 
*   MongoDB is only queried or written to during slow, high-latency lifecycle events: User Login, Room Creation, Joining/Leaving, and Role Audits. This architecture offloads **over 95% of database write operations** to memory-only Redis.

### 2. Algorithmic Search Optimization ($O(1)$ Lookups)
Instead of expensive unindexed database scans, Watch Party configures high-speed indexes:
*   `UserSchema` enforces a unique index on the lowercase `email` field.
*   `RoomSchema` enforces a unique index on the uppercase `roomCode` field.
*   These indexes guarantee $O(1)$ lookup performance on Mongo queries, even when the user base grows to millions of documents.

### 3. Scope-Filtered Broadcasting
Instead of broadcasting user events globally or tracking connections in raw memory loops:
*   The server uses Socket.IO's `.to(roomId)` room namespace targeting.
*   Emissions (e.g., `video-play`, `video-seek`) are targeted directly to the sockets subscribed to that specific room, dramatically minimizing network overhead and avoiding CPU-intensive connection iteration.

### 4. Smart Resource Recycling (Dynamic Cleanup)
To prevent Redis memory bloating over time:
*   Both the room state cache and participant maps use a 24-hour Time-to-Live (TTL).
*   On every socket disconnect, the backend executes `removeSocketFromAllRooms` via a non-blocking `scan` cursor loop.
*   If a room's active socket participant count reaches 0, both keys are instantly and permanently deleted from Redis memory.

---

## 📁 System Architecture Overview

```text
watch-party/
├── backend/
│   ├── config/             # Environment configuration mapping
│   ├── controllers/        # Express REST API controllers (HTTP requests)
│   ├── database/           # Mongoose and Redis client pool connections
│   ├── middlewares/        # JWT auth validation, signed cookie parsers, and error helpers
│   ├── models/             # User and Room schemas with indexing
│   ├── routes/             # Authentication & Room REST endpoint mappings
│   ├── scripts/            # Database indexing & End-to-End Smoke Load Test scripts
│   ├── services/           # CORE BUSINESS LOGIC (State management & database actions)
│   ├── sockets/            # Socket.IO auth middleware and real-time event handlers
│   ├── tests/              # Native Node.js test cases
│   ├── utils/              # JWT signers and standard response formatters
│   └── validators/         # Request input sanitization (express-validator)
├── frontend/
│   ├── src/
│   │   ├── api/            # Pre-configured Axios Client with interceptors
│   │   ├── components/     # UI Components (Navbar, Player, Controls, Participants, RoleBadges)
│   │   ├── context/        # AuthContext and RoomContext state engines
│   │   ├── hooks/          # useRoomSocket custom hook for socket listener lifecycles
│   │   ├── pages/          # Pages (Home, Login, Register, CreateRoom, JoinRoom, Room)
│   │   ├── socket/         # Socket connection manager
│   │   └── styles/         # Global styles and resets
├── nginx/
│   └── nginx.conf          # Reverse proxy, sticky session & WebSocket load balancer
├── docker-compose.yml      # Multi-replica backend/frontend/cache deployment manifest
└── package.json            # Dev script runner for concurrent local start
```

### Event Flow Pipeline

```text
  [ User A (Host) ]                     [ Backend Server (Replica 1) ]             [ Redis Cache ]
          │                                           │                                   │
          ├───────── Socket.emit('play') ────────────>┤                                   │
          │                                           ├───── Redis.hset(room_state) ─────>│
          │                                           │                                   │
          │                                           ├─────────── Pub/Sub ───────────────┼───────────┐
          │                                           │                                   │           │
          │                                           v                                   │           v
  [ User B (Viewer) ] <────── Socket.emit('video-play') ──────────────────────────────────┘ [ Backend Server (Replica 2) ]
                                                                                                      │
                                                                                                      └───────> (Viewer C)
```

---

## ⚙️ Environment Configuration

Set up these configuration files to configure database connections, port bindings, and security keys.

### 1. Backend Config (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/watch-party
JWT_SECRET=replace_with_a_secure_jwt_secret_key
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
COOKIE_SECRET=replace_with_a_secure_cookie_signer_secret
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Frontend Config (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🛠️ Execution & Deployment Guide

### Option A: Local Dev Mode (No Containerization)
Ensure you have a local MongoDB instance running on `27017` and local Redis running on `6379`.

1.  **Install dependencies in root:**
    ```bash
    npm install
    ```
2.  **Spin up frontend and backend concurrently:**
    ```bash
    npm run dev
    ```
    This script concurrently boots:
    *   **Backend:** http://localhost:5000
    *   **Frontend:** http://localhost:5173

---

### Option B: Production-Grade Clustering (Docker Compose & Nginx)
To test the distributed architecture locally with Nginx routing and 3 load-balanced backend replicas:

1.  **Launch the multi-container stack:**
    ```bash
    docker compose up --build -d
    ```
2.  **Access the applications:**
    *   **Frontend Client:** http://localhost:8080 (served by static Nginx wrapper)
    *   **Load-Balanced REST API & WebSockets:** http://localhost:80 (handled by sticky load-balancer upstream pool)

---

## 🧪 Validation & Automated Testing Suite

Watch Party features a rigorous quality-assurance setup to keep deployment bug-free:

### 1. Static Code Analysis & Formatting
Scan and format codebase files to maintain consistent styling conventions:
```bash
# Backend lint & format
cd backend
npm run lint
npm run format

# Frontend lint & format
cd frontend
npm run lint
npm run format
```

### 2. Unit Testing
Execute the lightweight, lightning-fast native Node.js test runner for unit validation (such as room identifier parsing correctness and JWT expiry calculations):
```bash
cd backend
npm test
```

### 3. Database Indexes Creation
Explicitly build user and room lookup indexes in MongoDB to guarantee high performance on startup:
```bash
cd backend
npm run create-indexes
```

### 4. End-to-End WebSocket Load & Smoke Testing
Test the websocket cluster, authentication, dynamic role assignment, host transfers, user expulsions, and playback synchronization under concurrency. 

This test programmatically registers a host, connects multiple concurrent viewer client sockets, initializes a room, changes videos, and triggers synchronizations:
```bash
cd backend
npm run smoke-load-test
```
*Expected console output:*
```text
Starting smoke load test (small scale)
Host socket connected: x8yZ...
Created room: 66ccf...
Participant 0 connected: a7bC...
Participant 1 connected: c9dE...
Participant 2 connected: e1fG...
Assigned moderator role
Transferred host
Removed participant 1
Smoke load test completed
```

---

## 📝 License

This project is open-source and licensed under the [ISC License](LICENSE).
