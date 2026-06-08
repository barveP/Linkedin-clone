'use strict';

const { GraphQLScalarType, Kind, GraphQLError } = require('graphql');
const { withFilter } = require('graphql-subscriptions');

const userService = require('../services/userService');
const postService = require('../services/postService');
const connectionService = require('../services/connectionService');
const activityService = require('../services/activityService');
const { pubsub, CHANNELS } = require('../redis/pubsub');

// ---- helpers ----------------------------------------------------------------

function requireAuth(ctx) {
  if (!ctx.userId) {
    throw new GraphQLError('You must be logged in to do that', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.userId;
}

const loadUser = (ctx, id) => (id ? ctx.loaders.users.load(Number(id)) : null);

// Normalize fields that arrive either as DB rows (snake_case) or as pipeline
// events (camelCase) so a single resolver handles both shapes.
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return null;
};

// ---- custom scalar ----------------------------------------------------------

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 date-time string',
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    return value ? new Date(value).toISOString() : null;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    return ast.kind === Kind.STRING ? new Date(ast.value) : null;
  },
});

// ---- resolvers --------------------------------------------------------------

const resolvers = {
  DateTime,

  Query: {
    me: (_p, _a, ctx) => (ctx.userId ? userService.getById(ctx.userId) : null),
    user: (_p, { id }, ctx) => loadUser(ctx, id),
    searchUsers: (_p, { term }, ctx) => userService.search(term, ctx.userId),
    post: (_p, { id }) => postService.getById(id),
    feed: (_p, { limit, offset }, ctx) => {
      requireAuth(ctx);
      return postService.getFeed(ctx.userId, { limit, offset });
    },
    connections: async (_p, _a, ctx) => {
      requireAuth(ctx);
      const ids = await connectionService.connectionIdsFor(ctx.userId);
      return ids.length ? ctx.loaders.users.loadMany(ids) : [];
    },
    connectionRequests: (_p, _a, ctx) => {
      requireAuth(ctx);
      return connectionService.pendingRequestsFor(ctx.userId);
    },
    recentActivity: (_p, { limit }) => activityService.recentActivities(limit || 20),
  },

  Mutation: {
    signup: (_p, { input }) => userService.signup(input),
    login: (_p, { email, password }) => userService.login({ email, password }),
    updateProfile: (_p, { input }, ctx) => {
      requireAuth(ctx);
      // Map GraphQL camelCase to the column name expected by the service.
      const patch = { ...input };
      if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
      return userService.updateProfile(ctx.userId, patch);
    },
    createPost: (_p, { content, imageUrl }, ctx) => {
      requireAuth(ctx);
      return postService.createPost(ctx.userId, { content, imageUrl });
    },
    likePost: (_p, { postId }, ctx) => {
      requireAuth(ctx);
      return postService.likePost(postId, ctx.userId);
    },
    unlikePost: (_p, { postId }, ctx) => {
      requireAuth(ctx);
      return postService.unlikePost(postId, ctx.userId);
    },
    commentOnPost: (_p, { postId, content }, ctx) => {
      requireAuth(ctx);
      return postService.addComment(postId, ctx.userId, content);
    },
    sendConnectionRequest: (_p, { userId }, ctx) => {
      requireAuth(ctx);
      return connectionService.sendRequest(ctx.userId, Number(userId));
    },
    respondConnectionRequest: (_p, { connectionId, accept }, ctx) => {
      requireAuth(ctx);
      return connectionService.respond(Number(connectionId), ctx.userId, accept);
    },
  },

  Subscription: {
    // Live activity feed. Subscribers receive every new activity event the
    // moment the Kafka consumer (or fallback) publishes it.
    activityAdded: {
      subscribe: () => pubsub.asyncIterator([CHANNELS.ACTIVITY_ADDED]),
    },
    // New posts, optionally filtered to a single author.
    postAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([CHANNELS.POST_ADDED]),
        (payload, variables) => {
          if (!variables || variables.authorId == null) return true;
          return Number(payload.postAdded.author_id) === Number(variables.authorId);
        }
      ),
    },
  },

  User: {
    // Email is PII — only expose it to the account owner, never to other
    // viewers or anonymous callers (prevents bulk email harvesting).
    email: (u, _a, ctx) => (ctx.userId && Number(ctx.userId) === Number(u.id) ? u.email : null),
    avatarUrl: (u) => pick(u, 'avatarUrl', 'avatar_url') || '',
    createdAt: (u) => pick(u, 'createdAt', 'created_at'),
    experiences: (u) => userService.listExperiences(u.id),
    posts: (u) => postService.getByAuthor(u.id, { limit: 20 }),
    connectionCount: async (u) => (await connectionService.connectionIdsFor(u.id)).length,
    connectionStatus: (u, _a, ctx) =>
      ctx.userId ? connectionService.getStatusBetween(ctx.userId, u.id) : 'NONE',
  },

  Experience: {
    startDate: (e) => (e.start_date ? new Date(e.start_date).toISOString().slice(0, 10) : null),
    endDate: (e) => (e.end_date ? new Date(e.end_date).toISOString().slice(0, 10) : null),
  },

  Post: {
    author: (p, _a, ctx) => loadUser(ctx, pick(p, 'author_id', 'authorId')),
    imageUrl: (p) => pick(p, 'imageUrl', 'image_url') || '',
    createdAt: (p) => pick(p, 'createdAt', 'created_at'),
    likeCount: (p, _a, ctx) => ctx.loaders.likeCount.load(p.id),
    commentCount: (p, _a, ctx) => ctx.loaders.commentCount.load(p.id),
    likedByMe: (p, _a, ctx) => (ctx.userId ? ctx.loaders.likedByMe.load(p.id) : false),
    comments: (p, _a, ctx) => ctx.loaders.comments.load(p.id),
  },

  Comment: {
    author: (c, _a, ctx) => loadUser(ctx, pick(c, 'author_id', 'authorId')),
    createdAt: (c) => pick(c, 'createdAt', 'created_at'),
  },

  Connection: {
    requester: (c, _a, ctx) => loadUser(ctx, pick(c, 'requester_id', 'requesterId')),
    addressee: (c, _a, ctx) => loadUser(ctx, pick(c, 'addressee_id', 'addresseeId')),
    createdAt: (c) => pick(c, 'createdAt', 'created_at'),
  },

  Activity: {
    actor: (a, _args, ctx) => loadUser(ctx, pick(a, 'actor_id', 'actorId')),
    objectType: (a) => pick(a, 'object_type', 'objectType'),
    objectId: (a) => pick(a, 'object_id', 'objectId'),
    createdAt: (a) => pick(a, 'createdAt', 'created_at'),
  },
};

module.exports = { resolvers };
