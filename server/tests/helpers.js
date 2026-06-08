'use strict';

const { ApolloServer } = require('@apollo/server');
const { schema } = require('../src/app');
const db = require('../src/db/knex');
const { createLoaders } = require('../src/context');

const server = new ApolloServer({ schema });

/**
 * Execute a GraphQL operation against the real schema with an optional
 * authenticated user. Returns { data, errors }.
 */
async function run(query, { variables = {}, userId = null } = {}) {
  const res = await server.executeOperation(
    { query, variables },
    { contextValue: { userId, loaders: createLoaders(userId) } }
  );
  return res.body.singleResult;
}

async function resetDb() {
  await db.raw(
    'TRUNCATE users, experiences, posts, comments, likes, connections, activities RESTART IDENTITY CASCADE'
  );
}

module.exports = { run, resetDb, db, server };
