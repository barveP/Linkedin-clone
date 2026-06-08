import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { ME } from '../graphql/operations';
import { getToken, setToken, clearToken } from './token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const apollo = useApolloClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [fetchMe] = useLazyQuery(ME, { fetchPolicy: 'network-only' });

  // On first load, if a token exists, resolve the current user.
  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }
    fetchMe()
      .then(({ data }) => {
        if (!active) return;
        if (data?.me) setUser(data.me);
        else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchMe]);

  const login = useCallback(
    async (token, basicUser) => {
      setToken(token);
      // Pull the full profile; fall back to the minimal user from the auth payload.
      try {
        const { data } = await fetchMe();
        setUser(data?.me || basicUser);
      } catch {
        setUser(basicUser);
      }
    },
    [fetchMe]
  );

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    await apollo.clearStore();
  }, [apollo]);

  const value = useMemo(
    () => ({ user, setUser, loading, login, logout, isAuthenticated: Boolean(user) }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
