import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getHomePathForRole, getRoleLabel } from "../auth/routing";

export default function DashboardLayout({
  title,
  subtitle,
  highlights = [],
  children,
}) {
  const { user, role, logout, homePath } = useAuth();

  return (
    <main className="dashboard-page">
      <section className="dashboard-shell compact-dashboard-shell">
        <header className="dashboard-topbar compact-dashboard-topbar">
          <div className="dashboard-branding">
            <span className="pill">{getRoleLabel(role || user?.role)}</span>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="dashboard-identity">
            <span className="pill">{user?.full_name || "No name"}</span>
            <span className="pill">{user?.email || "No email"}</span>
          </div>

          <div className="action-row compact-dashboard-actions">
            <Link
              className="secondary-btn"
              to={homePath || getHomePathForRole(role)}
            >
              Dashboard
            </Link>
            <Link className="ghost-btn" to="/me">
              Tai khoan
            </Link>
            <button className="primary-btn" type="button" onClick={logout}>
              Dang xuat
            </button>
          </div>
        </header>

        <div className="dashboard-summary-grid">
          {highlights.map((item) => (
            <article key={item.label} className="summary-card">
              <div className="small-text">{item.label}</div>
              <h2>{item.value}</h2>
            </article>
          ))}
        </div>

        <div className="dashboard-grid">{children}</div>
      </section>
    </main>
  );
}
