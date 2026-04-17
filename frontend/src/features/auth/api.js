import { apiPost } from "../../services/http";

export function loginUser(payload) {
  return apiPost("/api/auth/login", payload);
}

const LOGIN_ENDPOINTS_BY_ROLE = {
  USER: "/api/auth/login",
  SELLER: "/api/auth/seller-login",
  ADMIN: "/api/auth/admin-login",
  DELIVERY: "/api/auth/delivery-login",
};

export function loginByRole(payload, role) {
  const normalizedRole = String(role || "USER").toUpperCase();
  const endpoint = LOGIN_ENDPOINTS_BY_ROLE[normalizedRole] || "/api/auth/login";
  return apiPost(endpoint, payload);
}

export function requestRegisterOtp(payload) {
  return apiPost("/api/auth/register/request-otp", payload);
}

export function verifyRegisterOtp(payload) {
  return apiPost("/api/auth/register/verify-otp", payload);
}
