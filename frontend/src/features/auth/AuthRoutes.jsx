import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./useAuth";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { getHomePathForRole } from "./routing";
import UserDashboard from "../../features/dashboard/pages/UserDashboard";
import SellerDashboard from "../../features/dashboard/pages/SellerDashboard";
import AdminDashboard from "../../features/dashboard/pages/AdminDashboard";
import DeliveryDashboard from "../../features/dashboard/pages/DeliveryDashboard";

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireRole({ roles, children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = roles.map((role) => String(role || "").toUpperCase());
  const currentRole = String(user?.role || "").toUpperCase();
  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={getHomePathForRole(currentRole)} replace />;
  }

  return children;
}

function GuestOnlyRoute({ children }) {
  return children;
}

function HomeRedirect() {
  return <Navigate to="/login" replace />;
}

export default function AuthRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnlyRoute>
            <RegisterPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/me"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
      <Route
        path="/user"
        element={
          <RequireRole roles={["USER"]}>
            <UserDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/seller"
        element={
          <RequireRole roles={["SELLER"]}>
            <SellerDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireRole roles={["ADMIN"]}>
            <AdminDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/delivery"
        element={
          <RequireRole roles={["DELIVERY", "ADMIN"]}>
            <DeliveryDashboard />
          </RequireRole>
        }
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
