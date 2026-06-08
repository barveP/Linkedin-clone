'use strict';

const db = require('../db/knex');
const config = require('../config');
const { hashPassword, verifyPassword } = require('../auth/password');
const { signToken } = require('../auth/jwt');
const { redis } = require('../redis/client');

const PROFILE_CACHE_TTL = 60; // seconds

function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

async function signup({ email, password, name, headline }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password || !name) {
    throw new Error('email, password and name are required');
  }
  if (password.length < 6) {
    throw new Error('password must be at least 6 characters');
  }

  const existing = await db('users').where({ email: normalizedEmail }).first();
  if (existing) throw new Error('An account with that email already exists');

  const password_hash = await hashPassword(password);
  const [user] = await db('users')
    .insert({ email: normalizedEmail, password_hash, name, headline: headline || '' })
    .returning('*');

  return { token: signToken(user), user: publicUser(user) };
}

async function login({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await db('users').where({ email: normalizedEmail }).first();
  if (!user) throw new Error('Invalid email or password');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new Error('Invalid email or password');

  return { token: signToken(user), user: publicUser(user) };
}

async function getById(id) {
  if (!id) return null;
  // Skip the cache in tests: TRUNCATE ... RESTART IDENTITY reuses ids across
  // cases, which would otherwise collide with a still-cached profile.
  if (config.isTest) {
    return publicUser(await db('users').where({ id }).first());
  }
  const cacheKey = `user:${id}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) {
    /* cache is best-effort */
  }

  const user = publicUser(await db('users').where({ id }).first());
  if (user) {
    redis.set(cacheKey, JSON.stringify(user), 'EX', PROFILE_CACHE_TTL).catch(() => {});
  }
  return user;
}

// Batch loader for DataLoader (resolves N user ids in one query).
async function getByIds(ids) {
  const rows = await db('users').whereIn('id', ids);
  const map = new Map(rows.map((r) => [r.id, publicUser(r)]));
  return ids.map((id) => map.get(id) || null);
}

async function updateProfile(userId, input) {
  const allowed = ['name', 'headline', 'location', 'about', 'avatar_url'];
  const patch = {};
  for (const key of allowed) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (Object.keys(patch).length === 0) return getById(userId);

  patch.updated_at = db.fn.now();
  const [user] = await db('users').where({ id: userId }).update(patch).returning('*');
  redis.del(`user:${userId}`).catch(() => {});
  return publicUser(user);
}

async function search(term, viewerId) {
  const q = db('users').select('*');
  if (term && term.trim()) {
    const like = `%${term.trim()}%`;
    q.where(function () {
      this.whereILike('name', like).orWhereILike('headline', like).orWhereILike('location', like);
    });
  }
  if (viewerId) q.whereNot({ id: viewerId });
  const rows = await q.orderBy('name').limit(25);
  return rows.map(publicUser);
}

async function listExperiences(userId) {
  return db('experiences').where({ user_id: userId }).orderBy('start_date', 'desc');
}

module.exports = {
  signup,
  login,
  getById,
  getByIds,
  updateProfile,
  search,
  listExperiences,
  publicUser,
};
