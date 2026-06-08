'use strict';

const db = require('../db/knex');
const { recordActivity } = require('./activityService');

// Ordered pair helper so a connection between A and B is found regardless of
// who initiated it.
function pair(a, b) {
  return [Math.min(a, b), Math.max(a, b)];
}

async function getStatusBetween(userA, userB) {
  if (userA === userB) return 'SELF';
  const [lo, hi] = pair(userA, userB);
  const row = await db('connections')
    .where(function () {
      this.where({ requester_id: lo, addressee_id: hi }).orWhere({ requester_id: hi, addressee_id: lo });
    })
    .first();
  if (!row) return 'NONE';
  if (row.status === 'ACCEPTED') return 'CONNECTED';
  if (row.status === 'PENDING') {
    return row.requester_id === userA ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
  }
  return 'NONE';
}

async function sendRequest(requesterId, addresseeId) {
  if (requesterId === addresseeId) throw new Error('You cannot connect with yourself');

  const target = await db('users').where({ id: addresseeId }).first();
  if (!target) throw new Error('User not found');

  const existing = await db('connections')
    .where(function () {
      this.where({ requester_id: requesterId, addressee_id: addresseeId }).orWhere({
        requester_id: addresseeId,
        addressee_id: requesterId,
      });
    })
    .first();

  if (existing) {
    if (existing.status === 'ACCEPTED') throw new Error('You are already connected');
    if (existing.status === 'PENDING') throw new Error('A request is already pending');
    // Previously declined — allow a fresh request by reopening it.
    const [row] = await db('connections')
      .where({ id: existing.id })
      .update({ requester_id: requesterId, addressee_id: addresseeId, status: 'PENDING', updated_at: db.fn.now() })
      .returning('*');
    return row;
  }

  const [row] = await db('connections')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'PENDING' })
    .returning('*');
  return row;
}

async function respond(connectionId, userId, accept) {
  const conn = await db('connections').where({ id: connectionId }).first();
  if (!conn) throw new Error('Connection request not found');
  if (conn.addressee_id !== userId) throw new Error('Only the recipient can respond to this request');
  if (conn.status !== 'PENDING') throw new Error('This request has already been handled');

  const status = accept ? 'ACCEPTED' : 'DECLINED';
  const [row] = await db('connections')
    .where({ id: connectionId })
    .update({ status, updated_at: db.fn.now() })
    .returning('*');

  if (accept) {
    await recordActivity({
      actorId: userId,
      verb: 'CONNECTED',
      objectType: 'user',
      objectId: conn.requester_id,
    });
  }
  return row;
}

// Accepted connections for a user — returns the *other* user's id.
async function connectionIdsFor(userId) {
  const rows = await db('connections')
    .where({ status: 'ACCEPTED' })
    .andWhere(function () {
      this.where({ requester_id: userId }).orWhere({ addressee_id: userId });
    });
  return rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
}

async function pendingRequestsFor(userId) {
  return db('connections').where({ addressee_id: userId, status: 'PENDING' }).orderBy('created_at', 'desc');
}

module.exports = {
  sendRequest,
  respond,
  connectionIdsFor,
  pendingRequestsFor,
  getStatusBetween,
};
