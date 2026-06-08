'use strict';

require('dotenv').config();

const connection =
  process.env.DATABASE_URL ||
  'postgres://linkedin:linkedin@localhost:5433/linkedin';

const testConnection =
  process.env.TEST_DATABASE_URL ||
  connection.replace(/\/linkedin(\?|$)/, '/linkedin_test$1');

const base = {
  client: 'pg',
  migrations: {
    directory: './src/db/migrations',
  },
  seeds: {
    directory: './src/db/seeds',
  },
};

module.exports = {
  development: {
    ...base,
    connection,
    pool: { min: 2, max: 10 },
  },
  test: {
    ...base,
    connection: testConnection,
    pool: { min: 1, max: 5 },
  },
  production: {
    ...base,
    connection: {
      connectionString: connection,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 20 },
  },
};
