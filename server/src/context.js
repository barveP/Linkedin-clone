'use strict';

const DataLoader = require('dataloader');
const { verifyToken } = require('./auth/jwt');
const userService = require('./services/userService');
const postService = require('./services/postService');

function extractToken(raw) {
  if (!raw) return null;
  // Accept "Bearer <token>", "jwt <token>", or a bare token.
  const parts = String(raw).split(' ');
  return parts.length === 2 ? parts[1] : raw;
}

// Per-request loaders avoid the N+1 problem when a feed resolves many posts'
// authors, like/comment counts, comments, and the viewer's like state. Each
// becomes one batched grouped query instead of one query per post.
function createLoaders(viewerId) {
  return {
    users: new DataLoader((ids) => userService.getByIds(ids)),
    likeCount: new DataLoader((ids) => postService.likeCountsByPostIds(ids)),
    commentCount: new DataLoader((ids) => postService.commentCountsByPostIds(ids)),
    comments: new DataLoader((ids) => postService.commentsByPostIds(ids)),
    likedByMe: new DataLoader(postService.makeLikedByViewer(viewerId)),
  };
}

/**
 * Builds the GraphQL context for both HTTP (Apollo/Express) and WebSocket
 * (graphql-ws) transports. `authHeader` is the raw Authorization value.
 */
function buildContext(authHeader) {
  const token = extractToken(authHeader);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && payload.sub ? Number(payload.sub) : null;
  return { userId, loaders: createLoaders(userId) };
}

module.exports = { buildContext, createLoaders, extractToken };
