import { apiPost } from "../../services/http";

export function loginUser(payload) {
  return apiPost("/api/auth/login", payload);
}

export function requestRegisterOtp(payload) {
  return apiPost("/api/auth/register/request-otp", payload);
}

export function verifyRegisterOtp(payload) {
  return apiPost("/api/auth/register/verify-otp", payload);
}
