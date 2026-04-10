import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginForm from "../LoginForm";
import { loginUser } from "../api";
import { getHomePathForRole } from "../routing";
import { useAuth } from "../useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const onLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const data = await loginUser(loginForm);
      login(data.access_token, data.user);
      setNotice(`Dang nhap thanh cong: ${data.user?.email || loginForm.email}`);
      navigate(getHomePathForRole(data.user?.role), { replace: true });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Smart Vision Shop</h1>
        <p className="subtitle">Dang nhap theo vai tro cua tai khoan</p>

        <LoginForm
          loading={loading}
          form={loginForm}
          onFormChange={(field, value) =>
            setLoginForm((prev) => ({
              ...prev,
              [field]: value,
            }))
          }
          onSubmit={onLogin}
        />

        <p className="auth-switch">
          Chua co tai khoan? <Link to="/register">Dang ky bang OTP</Link>
        </p>

        {notice && <p className="notice">{notice}</p>}
      </section>
    </main>
  );
}
