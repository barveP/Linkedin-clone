'use strict';

const db = require('../db/knex');
const { recordActivity } = require('./activityService');
const connectionService = require('./connectionService');

async function createPost(authorId, { content, imageUrl }) {
  const text = String(content || '').trim();
  if (!text) throw new Error('Post content cannot be empty');
  if (text.length > 5000) throw new Error('Post is too long (max 5000 chars)');

  const [post] = await db('posts')
    .insert({ author_id: authorId, content: text, image_url: imageUrl || '' })
    .returning('*');

  // Emit POSTED activity carrying the post so the POST_ADDED subscription can
  // push the full post object to live feeds without a round-trip.
  await recordActivity({
    actorId: authorId,
    verb: 'POSTED',
    objectType: 'post',
    objectId: post.id,
    metadata: { preview: text.slice(0, 80) },
    post,
  });

  return post;
}

async function getById(id) {
  return db('posts').where({ id }).first();
}

async function getByAuthor(authorId, { limit = 20, offset = 0 } = {}) {
  return db('posts').where({ author_id: authorId }).orderBy('created_at', 'desc').limit(limit).offset(offset);
}

/**
 * The home feed: the viewer's own posts plus posts from accepted connections,
 * most recent first.
 */
async function getFeed(viewerId, { limit = 20, offset = 0 } = {}) {
  const connectionIds = await connectionService.connectionIdsFor(viewerId);
  const authorIds = [viewerId, ...connectionIds];
  return db('posts').whereIn('author_id', authorIds).orderBy('created_at', 'desc').limit(limit).offset(offset);
}

async function likePost(postId, userId) {
  const post = await getById(postId);
  if (!post) throw new Error('Post not found');

  // Idempotent: ignore duplicate likes thanks to the unique constraint.
  const inserted = await db('likes')
    .insert({ post_id: postId, user_id: userId })
    .onConflict(['post_id', 'user_id'])
    .ignore()
    .returning('*');

  if (inserted.length > 0) {
    await recordActivity({ actorId: userId, verb: 'LIKED', objectType: 'post', objectId: postId });
  }
  return getById(postId);
}

async function unlikePost(postId, userId) {
  await db('likes').where({ post_id: postId, user_id: userId }).del();
  return getById(postId);
}

async function addComment(postId, authorId, content) {
  const text = String(content || '').trim();
  if (!text) throw new Error('Comment cannot be empty');
  const post = await getById(postId);
  if (!post) throw new Error('Post not found');

  const [comment] = await db('comments')
    .insert({ post_id: postId, author_id: authorId, content: text })
    .returning('*');

  await recordActivity({ actorId: authorId, verb: 'COMMENTED', objectType: 'post', objectId: postId });
  return comment;
}

async function commentsFor(postId) {
  return db('comments').where({ post_id: postId }).orderBy('created_at', 'asc');
}

async function likeCount(postId) {
  const row = await db('likes').where({ post_id: postId }).count('* as c').first();
  return parseInt(row.c, 10);
}

async function commentCount(postId) {
  const row = await db('comments').where({ post_id: postId }).count('* as c').first();
  return parseInt(row.c, 10);
}

async function likedByViewer(postId, viewerId) {
  if (!viewerId) return false;
  const row = await db('likes').where({ post_id: postId, user_id: viewerId }).first();
  return Boolean(row);
}

// ---- Batch loaders (DataLoader) — collapse the feed's per-post N+1 into a
//      single grouped query per field across all posts in one request. --------

async function likeCountsByPostIds(postIds) {
  const rows = await db('likes').whereIn('post_id', postIds).groupBy('post_id').select('post_id').count('* as c');
  const map = new Map(rows.map((r) => [r.post_id, parseInt(r.c, 10)]));
  return postIds.map((id) => map.get(Number(id)) || 0);
}

async function commentCountsByPostIds(postIds) {
  const rows = await db('comments').whereIn('post_id', postIds).groupBy('post_id').select('post_id').count('* as c');
  const map = new Map(rows.map((r) => [r.post_id, parseInt(r.c, 10)]));
  return postIds.map((id) => map.get(Number(id)) || 0);
}

async function commentsByPostIds(postIds) {
  const rows = await db('comments').whereIn('post_id', postIds).orderBy('created_at', 'asc');
  const grouped = new Map(postIds.map((id) => [Number(id), []]));
  rows.forEach((r) => grouped.get(r.post_id)?.push(r));
  return postIds.map((id) => grouped.get(Number(id)) || []);
}

// Keyed by postId for a fixed viewer (one loader per request/viewer).
function makeLikedByViewer(viewerId) {
  return async function likedByViewerBatch(postIds) {
    if (!viewerId) return postIds.map(() => false);
    const rows = await db('likes').where({ user_id: viewerId }).whereIn('post_id', postIds).select('post_id');
    const liked = new Set(rows.map((r) => r.post_id));
    return postIds.map((id) => liked.has(Number(id)));
  };
}

module.exports = {
  createPost,
  getById,
  getByAuthor,
  getFeed,
  likePost,
  unlikePost,
  addComment,
  commentsFor,
  likeCount,
  commentCount,
  likedByViewer,
  likeCountsByPostIds,
  commentCountsByPostIds,
  commentsByPostIds,
  makeLikedByViewer,
};
