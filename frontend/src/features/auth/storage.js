const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token || "");
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}
