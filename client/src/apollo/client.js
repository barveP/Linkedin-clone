// Apollo Client wired for both HTTP (queries/mutations) and WebSocket
// (subscriptions). The split link routes subscription operations over graphql-ws
// and everything else over HTTP. The JWT (when present) is attached to both.
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { getToken } from '../auth/token';

const HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP || 'http://localhost:4000/graphql';
const WS_URL = import.meta.env.VITE_GRAPHQL_WS || 'ws://localhost:4000/graphql';

const httpLink = new HttpLink({ uri: HTTP_URL });

const authLink = setContext((_, { headers }) => {
  const token = getToken();
  return { headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: () => {
      const token = getToken();
      return token ? { authToken: `Bearer ${token}` } : {};
    },
  })
);

// Route subscriptions over WS, queries/mutations over HTTP.
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink)
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
