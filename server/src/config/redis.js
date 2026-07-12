const Redis = require('ioredis');
const env = require('./env');

const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

/**
 * Create a new Redis client instance.
 * Each consumer (BullMQ, pub/sub, caching) should use its own instance.
 */
const createRedisClient = () => {
  const client = new Redis(redisConnection);
  client.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });
  return client;
};

module.exports = { redisConnection, createRedisClient };
