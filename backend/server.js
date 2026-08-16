import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import app from './app.js';
import { config } from './config/config.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { connectRedis, disconnectRedis, pubClient, subClient } from './database/redis.js';
import { socketAuthMiddleware } from './sockets/socketAuthMiddleware.js';
import registerSocketHandlers from './sockets/socketHandlers.js';

const PORT = config.port;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO Server
const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Attach io instance to app for use in controllers if needed
app.set('io', io);

// Apply JWT authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// Register event handlers for each socket connection
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (user: ${socket.data.user?.username})`);
  registerSocketHandlers(socket, io);
});

// Connect to all datastores and start the HTTP server
const startServer = async () => {
  if (config.env !== 'test') {
    await connectDatabase();
    await connectRedis();

    // Attach the Redis adapter AFTER clients are connected.
    // This fans out Socket.IO events to all backend instances via Redis Pub/Sub.
    io.adapter(createAdapter(pubClient, subClient));
  }

  server.listen(PORT, () => {
    console.log('===============================================');
    console.log('  Watch Party Server listening on Port: ' + PORT);
    console.log('  Environment: ' + config.env);
    console.log('  Client URL: ' + config.clientUrl);
    console.log('===============================================');
  });
};

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP Server closed.');
    await disconnectDatabase();
    await disconnectRedis();
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
