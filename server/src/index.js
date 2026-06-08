'use strict';

const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { expressMiddleware } = require('@apollo/server/express4');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const config = require('./config');
const logger = require('./utils/logger');
const db = require('./db/knex');
const { schema, createApolloServer } = require('./app');
const { buildContext } = require('./context');
const { connectProducer, disconnectProducer } = require('./kafka/producer');
const { startConsumer, stopConsumer } = require('./kafka/consumer');

async function start() {
  // 1. Event pipeline: producer + consumer (no-ops if KAFKA_ENABLED=false).
  //    If either half fails we tear down the producer so events consistently
  //    use the direct PubSub fallback rather than being produced-but-unconsumed.
  try {
    await connectProducer();
    await startConsumer();
  } catch (err) {
    logger.warn('Kafka unavailable at startup — using direct PubSub fallback:', err.message);
    await disconnectProducer().catch(() => {});
  }

  // 2. HTTP + WebSocket transports share one Node http server.
  const app = express();
  const httpServer = http.createServer(app);

  // 3. WebSocket server for GraphQL subscriptions (graphql-ws protocol).
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const wsCleanup = useServer(
    {
      schema,
      context: (ctx) => {
        const params = ctx.connectionParams || {};
        return buildContext(params.authToken || params.Authorization || params.authorization);
      },
    },
    wsServer
  );

  // 4. Apollo Server over HTTP.
  const apollo = createApolloServer({ httpServer, wsCleanup });
  await apollo.start();

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'linkedin-clone-api' }));

  // Coarse abuse / brute-force guard on the single GraphQL endpoint. Generous
  // enough for normal SPA traffic; disabled under test.
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 200, // ~200 requests/min/IP — generous for normal SPA traffic
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest,
  });

  app.use(
    '/graphql',
    limiter,
    cors({ origin: config.clientOrigin, credentials: true }),
    express.json({ limit: '1mb' }),
    expressMiddleware(apollo, {
      context: async ({ req }) => buildContext(req.headers.authorization),
    })
  );

  await new Promise((resolve) => httpServer.listen(config.port, resolve));
  logger.info(`🚀 GraphQL API ready at http://localhost:${config.port}/graphql`);
  logger.info(`🔌 Subscriptions ready at ws://localhost:${config.port}/graphql`);

  // 5. Graceful shutdown.
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down…`);
    try {
      await apollo.stop();
      await stopConsumer();
      await disconnectProducer();
      await db.destroy();
    } catch (err) {
      logger.warn('Error during shutdown:', err.message);
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
