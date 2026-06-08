'use strict';

// Tiny structured logger — keeps dependencies light while giving consistent,
// timestamped output across the API, Kafka consumer, and subscription server.
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

const emit = (level, args) => {
  if (LEVELS[level] > threshold) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${ts}] ${level.toUpperCase()}`, ...args);
};

module.exports = {
  error: (...a) => emit('error', a),
  warn: (...a) => emit('warn', a),
  info: (...a) => emit('info', a),
  debug: (...a) => emit('debug', a),
};
