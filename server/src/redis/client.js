'use strict';

const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const options = {
  maxRetriesPerRequest: null, // let commands queue while reconnecting
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

// Primary connection used for caching / counters.
const redis = new Redis(config.redis.url, options);

redis.on('error', (err) => logger.warn('Redis error:', err.message));
redis.on('connect', () => logger.info('Redis connected'));

// Factory for the dedicated pub/sub connections that RedisPubSub needs
// (a subscriber connection cannot also issue normal commands).
function createRedisClient() {
  return new Redis(config.redis.url, options);
}

module.exports = { redis, createRedisClient };
