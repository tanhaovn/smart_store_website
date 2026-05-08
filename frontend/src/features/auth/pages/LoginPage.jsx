import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginForm from "../LoginForm";
import { loginByRole } from "../api";
import { getHomePathForRole } from "../routing";
import { useAuth } from "../useAuth";

const AnimatedHeader = () => {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>

      <div className="relative py-8">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full opacity-10 animate-float"
            style={{ animation: "float 6s ease-in-out infinite" }}
          ></div>
          <div
            className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full opacity-10 animate-float"
            style={{ animation: "float 8s ease-in-out infinite 1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/4 w-32 h-32 bg-white rounded-full opacity-5 animate-float"
            style={{ animation: "float 5s ease-in-out infinite 2s" }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Animated icon container */}
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-white animate-spin-slow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 0c0 0 2 4 2 9s-2 9-2 9m0-18c0 0-2 4-2 9s2 9 2 9M3 12h18"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-white">SMARTVISION MARKET</h2>
          <p className="text-sm text-white/80 mt-2 leading-relaxed max-w-xs mx-auto">
            Nền tảng thương mại hiện đại, tối giản và trực quan. Quản lý sản
            phẩm, đơn hàng và vận hành tập trung.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30 shadow-sm">
            <span className="animate-pulse-glow inline-block w-2 h-2 bg-white rounded-full"></span>
            Bảo mật cao • Trải nghiệm mượt mà
          </div>
        </div>
      </div>
    </>
  );
};

const ROLE_PRESETS = {
  USER: {
    label: "Người mua",
    hint: "Mua hàng, giỏ hàng, đặt đơn và chat shop",
    demoEmail: "user1@smartstore.local",
  },
  SELLER: {
    label: "Người bán",
    hint: "Quản lý sản phẩm, đơn hàng và khuyến mãi",
    demoEmail: "seller1@smartstore.local",
  },
  ADMIN: {
    label: "Admin",
    hint: "Quản lý quyền, duyệt sản phẩm và hệ thống",
    demoEmail: "admin@smartstore.local",
  },
  DELIVERY: {
    label: "Nhận đơn",
    hint: "Cập nhật trạng thái giao hàng và thông tin giao",
    demoEmail: "delivery@smartstore.local",
  },
};

const DEMO_PASSWORD = "Hao@1909";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState("USER");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const selectedRoleMeta = ROLE_PRESETS[role] || ROLE_PRESETS.USER;

  const onChooseRole = (nextRole) => {
    setRole(nextRole);
    setNotice("");
  };

  const onFillDemoAccount = () => {
    setLoginForm({
      email: selectedRoleMeta.demoEmail,
      password: DEMO_PASSWORD,
    });
    setNotice(`Đã điền nhanh tài khoản demo ${selectedRoleMeta.label}`);
  };

  const onLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const data = await loginByRole(loginForm, role);
      login(data.access_token, data.user);
      setNotice(`Đăng nhập thành công: ${data.user?.email || loginForm.email}`);
      navigate(getHomePathForRole(data.user?.role), { replace: true });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <section className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-3xl border border-white/50 bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white shadow-2xl md:block">
          <AnimatedHeader />
        </div>

        <div className="rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
          <h1 className="text-2xl font-extrabold text-teal-900 md:text-3xl">
            Smart Vision Shop
          </h1>
          <p className="mt-2 text-sm text-teal-700">
            Đăng nhập theo đúng quyền để vào đúng dashboard
          </p>

          <label className="mt-5 block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 uppercase tracking-wide">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a4 4 0 00-5-5M9 20H4v-2a4 4 0 015-5m6-5a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Vai trò
            </span>
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <select
                className="w-full rounded-xl border border-teal-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200 appearance-none cursor-pointer"
                value={role}
                onChange={(e) => onChooseRole(e.target.value)}
              >
                {Object.entries(ROLE_PRESETS).map(([roleKey, roleMeta]) => (
                  <option key={roleKey} value={roleKey}>
                    {roleMeta.label}
                  </option>
                ))}
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </label>

          <button
            className="mt-4 w-full rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
            type="button"
            onClick={onFillDemoAccount}
          >
            Điền nhanh tài khoản demo
          </button>

          <LoginForm
            loading={loading}
            form={loginForm}
            role={role}
            onRoleChange={setRole}
            onFormChange={(field, value) =>
              setLoginForm((prev) => ({
                ...prev,
                [field]: value,
              }))
            }
            onSubmit={onLogin}
          />

          <p className="mt-4 text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link
              className="font-semibold text-teal-600 hover:text-teal-700"
              to="/register"
            >
              Đăng ký bằng OTP
            </Link>
          </p>

          {notice && (
            <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {notice}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
