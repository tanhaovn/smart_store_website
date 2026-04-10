import { useMemo, useState } from "react";
import {
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "./storage";
import { getHomePathForRole } from "./routing";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());

  const isAuthenticated = Boolean(token);
  const role = (user?.role || "").toUpperCase();
  const homePath = getHomePathForRole(role);

  const login = (nextToken, nextUser) => {
    setStoredToken(nextToken);
    const normalizedUser = nextUser
      ? {
          ...nextUser,
          role: String(nextUser.role || "USER").toUpperCase(),
        }
      : null;
    setStoredUser(normalizedUser);
    setToken(nextToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    clearStoredToken();
    clearStoredUser();
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      role,
      homePath,
      isRole: (candidateRole) =>
        role === String(candidateRole || "").toUpperCase(),
      login,
      logout,
    }),
    [token, user, isAuthenticated, role, homePath],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
