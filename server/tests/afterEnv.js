'use strict';

// Close shared connections after each test file so Jest can exit cleanly.
afterAll(async () => {
  try {
    await require('../src/db/knex').destroy();
  } catch (_) {}
  try {
    require('../src/redis/client').redis.disconnect();
  } catch (_) {}
  try {
    await require('../src/redis/pubsub').pubsub.close();
  } catch (_) {}
});
