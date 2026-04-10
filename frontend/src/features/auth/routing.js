const ROLE_HOME_PATHS = {
  USER: "/user",
  SELLER: "/seller",
  ADMIN: "/admin",
  DELIVERY: "/delivery",
};

export function getHomePathForRole(role) {
  return ROLE_HOME_PATHS[String(role || "").toUpperCase()] || "/me";
}

export function getRoleLabel(role) {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "DELIVERY") {
    return "Giao hàng";
  }
  if (normalizedRole === "SELLER") {
    return "Seller";
  }
  if (normalizedRole === "ADMIN") {
    return "Admin";
  }
  return "Khách hàng";
}
