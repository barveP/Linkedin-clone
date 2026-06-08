'use strict';

const { makeExecutableSchema } = require('@graphql-tools/schema');
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');

const config = require('./config');
const logger = require('./utils/logger');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');

// Single executable schema reused by the HTTP server, the WS subscription
// server, and the Jest test harness.
const schema = makeExecutableSchema({ typeDefs, resolvers });

/**
 * Creates an ApolloServer bound to an httpServer (and optional ws cleanup) so
 * both the HTTP request and WebSocket connections drain cleanly on shutdown.
 */
function createApolloServer({ httpServer, wsCleanup } = {}) {
  const plugins = [];
  if (httpServer) plugins.push(ApolloServerPluginDrainHttpServer({ httpServer }));
  if (wsCleanup) {
    plugins.push({
      async serverWillStart() {
        return {
          async drainServer() {
            await wsCleanup.dispose();
          },
        };
      },
    });
  }
  return new ApolloServer({
    schema,
    plugins,
    // Never leak stacktraces/internal paths to clients in production.
    includeStacktraceInErrorResponses: !config.isProduction,
    formatError: (formattedError, error) => {
      if (config.isProduction) {
        logger.error('GraphQL error:', error);
        const { stacktrace, ...extensions } = formattedError.extensions || {};
        return { ...formattedError, extensions };
      }
      return formattedError;
    },
  });
}

module.exports = { schema, createApolloServer };
