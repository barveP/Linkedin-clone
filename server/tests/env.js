'use strict';

// Runs before any module is imported in a test worker. Force the test profile
// and disable Kafka so tests exercise the direct PubSub fallback (no broker
// dependency in unit/integration tests).
process.env.NODE_ENV = 'test';
process.env.KAFKA_ENABLED = 'false';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
