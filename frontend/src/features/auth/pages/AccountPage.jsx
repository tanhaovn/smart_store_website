import { Link } from "react-router-dom";
import { getHomePathForRole, getRoleLabel } from "../routing";
import { useAuth } from "../useAuth";

export default function AccountPage() {
  const { user, logout, homePath } = useAuth();

  return (
    <main className="auth-page account-page">
      <section className="auth-card">
        <h1>Xin chào, {user?.full_name || "bạn"}</h1>
        <p className="subtitle">
          Tài khoản của bạn đang ở vai trò {getRoleLabel(user?.role)}.
        </p>

        <div className="user-summary">
          <p>
            <strong>Email:</strong> {user?.email || "-"}
          </p>
          <p>
            <strong>Họ tên:</strong> {user?.full_name || "-"}
          </p>
          <p>
            <strong>Vai trò:</strong> {user?.role || "USER"}
          </p>
        </div>

        <div className="action-row">
          <Link
            className="secondary-btn"
            to={homePath || getHomePathForRole(user?.role)}
          >
            Vào dashboard
          </Link>
          <button className="primary-btn" type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>

        <p className="auth-switch">
          Quay lại <Link to="/login">trang đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
