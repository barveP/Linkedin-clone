'use strict';

const knexFactory = require('knex');
const { Client } = require('pg');

// Creates the test database (if needed) and runs migrations once before the
// whole suite. Idempotent — safe to run repeatedly and in CI.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const knexConfig = require('../knexfile');
  const testCfg = knexConfig.test;
  const connStr = testCfg.connection;

  const url = new URL(connStr);
  const dbName = url.pathname.replace(/^\//, '');

  // Connect to the maintenance DB to create the test DB if it's missing.
  const adminUrl = new URL(connStr);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  const db = knexFactory(testCfg);
  await db.migrate.latest();
  await db.destroy();
};
