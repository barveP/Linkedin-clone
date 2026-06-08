'use strict';

const { RedisPubSub } = require('graphql-redis-subscriptions');
const { createRedisClient } = require('./client');

// Redis-backed PubSub so GraphQL subscriptions fan out across every API
// instance (horizontally scalable), not just the process that produced the event.
const pubsub = new RedisPubSub({
  publisher: createRedisClient(),
  subscriber: createRedisClient(),
});

// Subscription channel names.
const CHANNELS = {
  ACTIVITY_ADDED: 'ACTIVITY_ADDED',
  POST_ADDED: 'POST_ADDED',
};

module.exports = { pubsub, CHANNELS };
