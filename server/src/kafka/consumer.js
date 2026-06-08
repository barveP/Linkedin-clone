'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const topics = require('./topics');
const { getKafka } = require('./client');
const { markDown } = require('./producer');
const { pubsub, CHANNELS } = require('../redis/pubsub');

let consumer = null;

/**
 * The consumer is the heart of the event-driven feed: it reads activity events
 * off Kafka and fans them out to GraphQL subscribers via the Redis PubSub.
 * Decoupling write-path (produce) from delivery (consume) means a burst of
 * posts never blocks the request that created them.
 */
async function startConsumer() {
  if (!config.kafka.enabled) return;

  consumer = getKafka().consumer({ groupId: 'activity-feed-fanout' });

  // If the consumer crashes or drops at runtime, downgrade the producer so the
  // write path uses the direct PubSub fallback rather than producing events
  // that no live consumer would ever fan out to subscribers.
  const { CRASH, STOP, DISCONNECT } = consumer.events;
  [CRASH, STOP, DISCONNECT].forEach((evt) =>
    consumer.on(evt, (e) => {
      logger.warn(`Kafka consumer ${evt} — switching activity feed to direct PubSub fallback`, e?.payload?.error?.message || '');
      markDown();
    })
  );

  await consumer.connect();
  await consumer.subscribe({ topic: topics.ACTIVITY_EVENTS, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await fanout(event);
      } catch (err) {
        logger.warn('Failed to process activity event:', err.message);
      }
    },
  });

  logger.info('Kafka consumer running (group: activity-feed-fanout)');
}

// Publish the activity to subscribers. Shared by the consumer and the
// no-Kafka fallback path so behaviour is identical either way.
async function fanout(event) {
  await pubsub.publish(CHANNELS.ACTIVITY_ADDED, { activityAdded: event });
  if (event.verb === 'POSTED' && event.post) {
    await pubsub.publish(CHANNELS.POST_ADDED, { postAdded: event.post });
  }
}

async function stopConsumer() {
  if (consumer) await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer, fanout };
