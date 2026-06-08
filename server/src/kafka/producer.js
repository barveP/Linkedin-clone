'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const topics = require('./topics');
const { getKafka, ensureTopics } = require('./client');

let producer = null;
let ready = false;

async function connectProducer() {
  if (!config.kafka.enabled) {
    logger.warn('Kafka disabled (KAFKA_ENABLED=false) — events use direct pub/sub fallback.');
    return;
  }
  await ensureTopics([topics.ACTIVITY_EVENTS]);
  producer = getKafka().producer();
  await producer.connect();
  ready = true;
  logger.info('Kafka producer connected:', config.kafka.brokers.join(','));
}

/**
 * Publish an activity event. Returns true if it was handed to Kafka, false if
 * Kafka is unavailable (caller then falls back to direct pub/sub).
 */
async function publishActivityEvent(event) {
  if (!ready || !producer) return false;
  try {
    await producer.send({
      topic: topics.ACTIVITY_EVENTS,
      messages: [{ key: String(event.actorId), value: JSON.stringify(event) }],
    });
    return true;
  } catch (err) {
    logger.warn('Kafka publish failed, falling back:', err.message);
    return false;
  }
}

async function disconnectProducer() {
  if (producer) await producer.disconnect();
  ready = false;
}

function isReady() {
  return ready;
}

// Called when the consumer dies at runtime: flip the producer to "not ready"
// so recordActivity() routes events through the direct PubSub fallback instead
// of producing messages that no live consumer would fan out.
function markDown() {
  ready = false;
}

module.exports = { connectProducer, publishActivityEvent, disconnectProducer, isReady, markDown };
