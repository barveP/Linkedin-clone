'use strict';

const { Kafka, logLevel } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

let kafka = null;

function getKafka() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.NOTHING,
      // Short, bounded retries so that if no broker is present the app falls
      // back to direct PubSub within a couple of seconds instead of hanging.
      connectionTimeout: 3000,
      requestTimeout: 5000,
      retry: { retries: 2, initialRetryTime: 200, maxRetryTime: 1500 },
    });
  }
  return kafka;
}

/**
 * Idempotently create the topics the app needs. Doing this up front avoids the
 * race where a consumer subscribes before the first produce auto-creates the
 * topic ("This server does not host this topic-partition").
 */
async function ensureTopics(topicNames) {
  const admin = getKafka().admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: topicNames.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
    });
  } catch (err) {
    // "Topic already exists" is fine; anything else is worth surfacing.
    if (!/already exists/i.test(err.message)) logger.warn('ensureTopics:', err.message);
  } finally {
    await admin.disconnect();
  }
}

module.exports = { getKafka, ensureTopics };
