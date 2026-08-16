import Redis from 'ioredis';
import { config } from '../config/config.js';

/**
 * General-purpose Redis client used by roomStateService for reads and writes.
 */
export let redisClient = null;

/**
 * Publisher client used exclusively by the Socket.IO Redis adapter.
 * Must be a separate connection from subClient.
 */
export let pubClient = null;

/**
 * Subscriber client used exclusively by the Socket.IO Redis adapter.
 * ioredis puts this connection into subscriber-only mode once subscribe() is called.
 */
export let subClient = null;

const createClient = (name) => {
  const client = new Redis(config.redisUrl, {
    // Retry with exponential backoff, capped at 3 s
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });

  client.on('connect', () => console.log(`[Redis] ${name} connected`));
  client.on('error', (err) => console.error(`[Redis] ${name} error:`, err.message));

  return client;
};

/**
 * Initialise all three Redis connections.
 * Call this once before starting the HTTP server.
 */
export const connectRedis = async () => {
  redisClient = createClient('main');
  pubClient = createClient('pub');
  subClient = createClient('sub');

  await Promise.all([
    redisClient.connect(),
    pubClient.connect(),
    subClient.connect(),
  ]);

  console.log('[Redis] All clients ready');
};

/**
 * Gracefully close all Redis connections.
 * Mirrors disconnectDatabase() from database/connection.js.
 */
export const disconnectRedis = async () => {
  try {
    await Promise.all([
      redisClient?.quit(),
      pubClient?.quit(),
      subClient?.quit(),
    ]);
    console.log('[Redis] All clients disconnected');
  } catch (err) {
    console.error('[Redis] Error during disconnect:', err.message);
  }
};
