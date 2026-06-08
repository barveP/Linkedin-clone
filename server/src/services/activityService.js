'use strict';

const db = require('../db/knex');
const { publishActivityEvent, isReady } = require('../kafka/producer');
const { fanout } = require('../kafka/consumer');

/**
 * Records an activity in Postgres (the durable feed log) and emits it onto the
 * event pipeline. Preferred path: Kafka -> consumer -> Redis PubSub. If Kafka is
 * unavailable we fan out directly to PubSub so the feature still works in dev.
 */
async function recordActivity({ actorId, verb, objectType, objectId, metadata = {}, post = null }) {
  const [activity] = await db('activities')
    .insert({
      actor_id: actorId,
      verb,
      object_type: objectType,
      object_id: objectId || null,
      metadata: JSON.stringify(metadata),
    })
    .returning('*');

  const event = {
    id: activity.id,
    actorId,
    verb,
    objectType,
    objectId: objectId || null,
    metadata,
    createdAt: activity.created_at,
    post,
  };

  // Delivery is exactly one path, chosen by whether Kafka is currently usable:
  //  - Kafka ready  -> produce; the consumer fans out to subscribers.
  //  - Kafka down   -> publish directly to PubSub.
  // Choosing up front (rather than producing then also falling back on a send
  // error) avoids double-delivering the same event to subscribers.
  if (isReady()) {
    await publishActivityEvent(event);
  } else {
    await fanout(event);
  }

  return activity;
}

// Global recent-activity feed (most recent first), used by the feed sidebar.
// Returns raw snake_case rows; the Activity.* field resolvers normalize them
// (they also accept the camelCase shape emitted onto the live event pipeline).
async function recentActivities(limit = 20) {
  return db('activities').orderBy('created_at', 'desc').limit(limit);
}

module.exports = { recordActivity, recentActivities };
