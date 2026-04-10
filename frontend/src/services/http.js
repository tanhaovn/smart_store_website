import { getStoredToken } from "../features/auth/storage";

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = options.token ?? getStoredToken();
  const hasBody = options.body !== undefined && options.body !== null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    hasBody &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: hasBody
      ? options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  const payload = await readResponse(response);
  const message = payload?.message || payload?.error || "Request failed";
  if (!response.ok) {
    throw new Error(message);
  }

  return payload?.data ?? payload;
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function apiPost(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "POST", body });
}

export function apiPatch(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "PATCH", body });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, { ...options, method: "DELETE" });
}
