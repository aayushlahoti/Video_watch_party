import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { config } from './config/config.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
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

// Connect to Database and start server
const startServer = async () => {
  // Connect to database (In development without Atlas, make sure you configure .env properly)
  if (config.env !== 'test') {
    await connectDatabase();
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
