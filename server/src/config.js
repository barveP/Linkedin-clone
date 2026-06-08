'use strict';

require('dotenv').config();

const bool = (value, fallback) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// JWT secret: required in production. A weak default is only ever allowed in
// dev/test so a misconfigured production deploy can't silently sign tokens with
// a publicly-known string (which would let anyone forge any user's identity).
const jwtSecret = process.env.JWT_SECRET;
if (isProduction && !jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}

const config = {
  env,
  isProduction,
  isTest: env === 'test',
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  jwt: {
    secret: jwtSecret || 'dev_only_insecure_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  database: {
    // The compose file maps Postgres to host port 5433; the bare fallback below
    // matches it. The real value comes from DATABASE_URL (.env). CI overrides
    // this to 5432 (GitHub Actions service ports) via the environment.
    url:
      process.env.DATABASE_URL ||
      'postgres://linkedin:linkedin@localhost:5433/linkedin',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  kafka: {
    enabled: bool(process.env.KAFKA_ENABLED, true),
    clientId: process.env.KAFKA_CLIENT_ID || 'linkedin-clone',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
  },
};

module.exports = config;
