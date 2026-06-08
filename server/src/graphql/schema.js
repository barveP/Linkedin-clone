'use strict';

// GraphQL schema (SDL). Queries, mutations, and real-time subscriptions for the
// LinkedIn clone: auth, profiles, posts, connections, and the activity feed.
const typeDefs = /* GraphQL */ `
  scalar DateTime

  enum ConnectionStatus {
    SELF
    NONE
    CONNECTED
    REQUEST_SENT
    REQUEST_RECEIVED
  }

  type User {
    id: ID!
    email: String
    name: String!
    headline: String
    location: String
    about: String
    avatarUrl: String
    createdAt: DateTime
    experiences: [Experience!]!
    posts: [Post!]!
    connectionCount: Int!
    connectionStatus: ConnectionStatus!
  }

  type Experience {
    id: ID!
    title: String!
    company: String!
    location: String
    startDate: String
    endDate: String
    description: String
  }

  type Post {
    id: ID!
    author: User!
    content: String!
    imageUrl: String
    createdAt: DateTime!
    likeCount: Int!
    commentCount: Int!
    likedByMe: Boolean!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type Connection {
    id: ID!
    requester: User!
    addressee: User!
    status: String!
    createdAt: DateTime!
  }

  type Activity {
    id: ID!
    actor: User!
    verb: String!
    objectType: String!
    objectId: Int
    createdAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input SignupInput {
    email: String!
    password: String!
    name: String!
    headline: String
  }

  input ProfileInput {
    name: String
    headline: String
    location: String
    about: String
    avatarUrl: String
  }

  type Query {
    me: User
    user(id: ID!): User
    searchUsers(term: String): [User!]!
    feed(limit: Int, offset: Int): [Post!]!
    post(id: ID!): Post
    connections: [User!]!
    connectionRequests: [Connection!]!
    recentActivity(limit: Int): [Activity!]!
  }

  type Mutation {
    signup(input: SignupInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateProfile(input: ProfileInput!): User!
    createPost(content: String!, imageUrl: String): Post!
    likePost(postId: ID!): Post!
    unlikePost(postId: ID!): Post!
    commentOnPost(postId: ID!, content: String!): Comment!
    sendConnectionRequest(userId: ID!): Connection!
    respondConnectionRequest(connectionId: ID!, accept: Boolean!): Connection!
  }

  type Subscription {
    activityAdded: Activity!
    postAdded(authorId: ID): Post!
  }
`;

module.exports = { typeDefs };
