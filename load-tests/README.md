This folder contains guidance for running load tests against the Watch Party server.

Smoke test (small scale)
- A smoke test script is included at `backend/scripts/smokeLoadTest.js`. It:
  - Registers a host and several participants
  - Creates a room and has participants join
  - Simulates host actions: change-video, play, seek, pause
  - Tests role assignment, host transfer, and removal

Run locally (after installing backend deps):
```bash
cd backend
npm ci
# Start the backend (and Mongo) - use your normal dev or docker-compose
node server.js
# In another terminal, run the smoke test
npm run smoke-load-test
```

Larger-scale testing
- For high-concurrency load testing of Socket.IO, use Artillery with the `socketio` engine or a specialized tool.
- Example Artillery command (install artillery first):
```bash
npm i -g artillery
artillery run path/to/socketio.yml
```

Notes on authentication
- The smoke test uses the real HTTP auth endpoints to obtain signed cookies and passes them in the socket handshake headers.
- Ensure your `MONGODB_URI` is set and the server is reachable.

Metrics to observe
- Socket latency and message propagation time
- Memory/CPU usage of the server process
- MongoDB query/connection utilization
- Number of open socket connections (Socket.IO / OS file descriptors)
