import { Link } from "react-router-dom";
import { getHomePathForRole, getRoleLabel } from "../routing";
import { useAuth } from "../useAuth";

export default function AccountPage() {
  const { user, logout, homePath } = useAuth();

  return (
    <main className="auth-page account-page">
      <section className="auth-card">
        <h1>Xin chao, {user?.full_name || "ban"}</h1>
        <p className="subtitle">
          Tai khoan cua ban dang o vai tro {getRoleLabel(user?.role)}.
        </p>

        <div className="user-summary">
          <p>
            <strong>Email:</strong> {user?.email || "-"}
          </p>
          <p>
            <strong>Ho ten:</strong> {user?.full_name || "-"}
          </p>
          <p>
            <strong>Vai tro:</strong> {user?.role || "USER"}
          </p>
        </div>

        <div className="action-row">
          <Link
            className="secondary-btn"
            to={homePath || getHomePathForRole(user?.role)}
          >
            Vao dashboard
          </Link>
          <button className="primary-btn" type="button" onClick={logout}>
            Dang xuat
          </button>
        </div>

        <p className="auth-switch">
          Quay lai <Link to="/login">trang dang nhap</Link>
        </p>
      </section>
    </main>
  );
}
