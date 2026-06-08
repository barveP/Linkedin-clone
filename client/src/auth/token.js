// Tiny token store kept separate from AuthContext so the Apollo links can read
// the JWT without importing React (avoids a circular dependency).
const KEY = 'inlink.token';

export const getToken = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* storage may be unavailable (private mode) */
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};
