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
      <section className="dashboard-shell">
        <header className="dashboard-hero">
          <div className="hero-card">
            <span className="pill">{getRoleLabel(role || user?.role)}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="hero-meta">
              <span className="pill">{user?.full_name || "No name"}</span>
              <span className="pill">{user?.email || "No email"}</span>
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
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
          </div>

          <div className="hero-card">
            <h2>Trang nhanh</h2>
            <div className="stats-grid" style={{ marginTop: 12 }}>
              {highlights.map((item) => (
                <article key={item.label} className="stat-card">
                  <div className="small-text">{item.label}</div>
                  <h2 style={{ marginTop: 6 }}>{item.value}</h2>
                </article>
              ))}
            </div>
          </div>
        </header>

        <div className="dashboard-grid">{children}</div>
      </section>
    </main>
  );
}
