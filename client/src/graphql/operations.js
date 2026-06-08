import { gql } from '@apollo/client';

// ---- Fragments --------------------------------------------------------------

export const USER_CARD = gql`
  fragment UserCard on User {
    id
    name
    headline
    avatarUrl
    location
    connectionStatus
  }
`;

export const POST_FIELDS = gql`
  fragment PostFields on Post {
    id
    content
    imageUrl
    createdAt
    likeCount
    commentCount
    likedByMe
    author {
      id
      name
      headline
      avatarUrl
    }
  }
`;

// ---- Auth -------------------------------------------------------------------

export const ME = gql`
  query Me {
    me {
      id
      name
      email
      headline
      location
      about
      avatarUrl
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name }
    }
  }
`;

export const SIGNUP = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      token
      user { id name }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: ProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      headline
      location
      about
      avatarUrl
    }
  }
`;

// ---- Feed / posts -----------------------------------------------------------

export const FEED = gql`
  ${POST_FIELDS}
  query Feed($limit: Int, $offset: Int) {
    feed(limit: $limit, offset: $offset) {
      ...PostFields
    }
  }
`;

export const CREATE_POST = gql`
  ${POST_FIELDS}
  mutation CreatePost($content: String!, $imageUrl: String) {
    createPost(content: $content, imageUrl: $imageUrl) {
      ...PostFields
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) { id likeCount likedByMe }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId) { id likeCount likedByMe }
  }
`;

export const COMMENT_ON_POST = gql`
  mutation CommentOnPost($postId: ID!, $content: String!) {
    commentOnPost(postId: $postId, content: $content) {
      id
      content
      createdAt
      author { id name avatarUrl }
    }
  }
`;

export const POST_DETAIL = gql`
  ${POST_FIELDS}
  query PostDetail($id: ID!) {
    post(id: $id) {
      ...PostFields
      comments { id content createdAt author { id name avatarUrl } }
    }
  }
`;

// ---- Profiles / people ------------------------------------------------------

export const USER_PROFILE = gql`
  ${POST_FIELDS}
  query UserProfile($id: ID!) {
    user(id: $id) {
      id
      name
      headline
      location
      about
      avatarUrl
      connectionCount
      connectionStatus
      experiences { id title company location startDate endDate description }
      posts { ...PostFields }
    }
  }
`;

export const SEARCH_USERS = gql`
  ${USER_CARD}
  query SearchUsers($term: String) {
    searchUsers(term: $term) { ...UserCard }
  }
`;

// ---- Connections ------------------------------------------------------------

export const CONNECTIONS = gql`
  ${USER_CARD}
  query Connections {
    connections { ...UserCard }
  }
`;

export const CONNECTION_REQUESTS = gql`
  query ConnectionRequests {
    connectionRequests {
      id
      createdAt
      requester { id name headline avatarUrl }
    }
  }
`;

export const SEND_CONNECTION_REQUEST = gql`
  mutation SendConnectionRequest($userId: ID!) {
    sendConnectionRequest(userId: $userId) { id status }
  }
`;

export const RESPOND_CONNECTION_REQUEST = gql`
  mutation RespondConnectionRequest($connectionId: ID!, $accept: Boolean!) {
    respondConnectionRequest(connectionId: $connectionId, accept: $accept) { id status }
  }
`;

// ---- Activity feed (real-time) ---------------------------------------------

export const RECENT_ACTIVITY = gql`
  query RecentActivity($limit: Int) {
    recentActivity(limit: $limit) {
      id
      verb
      objectType
      createdAt
      actor { id name avatarUrl }
    }
  }
`;

export const ACTIVITY_ADDED = gql`
  subscription ActivityAdded {
    activityAdded {
      id
      verb
      objectType
      createdAt
      actor { id name avatarUrl }
    }
  }
`;

export const POST_ADDED = gql`
  ${POST_FIELDS}
  subscription PostAdded($authorId: ID) {
    postAdded(authorId: $authorId) {
      ...PostFields
    }
  }
`;
