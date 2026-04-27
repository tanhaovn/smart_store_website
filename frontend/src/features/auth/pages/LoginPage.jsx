import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginForm from "../LoginForm";
import { loginByRole } from "../api";
import { getHomePathForRole } from "../routing";
import { useAuth } from "../useAuth";

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
          <p className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
            SMARTVISION MARKET
          </p>
          <h2 className="text-3xl font-extrabold leading-tight">
            Giao dien xanh ngoc,
            <br />
            bán hàng hiện đại
          </h2>
          <p className="mt-4 max-w-sm text-sm text-emerald-50">
            Đăng nhập nhanh theo vai trò, vào đúng dashboard và quản lý toàn bộ
            luồng bán hàng trong một giao diện gọn đẹp.
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 p-3">
              USER: đặt hàng và theo dõi đơn
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              SELLER: quản lý sản phẩm và đơn
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              DELIVERY + ADMIN: điều phối và vận hành
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
          <h1 className="text-2xl font-extrabold text-teal-900 md:text-3xl">
            Smart Vision Shop
          </h1>
          <p className="mt-2 text-sm text-teal-700">
            Đăng nhập theo đúng quyền để vào đúng dashboard
          </p>

          <div
            className="mt-5 grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="Vai trò đăng nhập"
          >
            {Object.entries(ROLE_PRESETS).map(([roleKey, roleMeta]) => (
              <button
                key={roleKey}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  role === roleKey
                    ? "border-teal-500 bg-teal-500 text-white shadow"
                    : "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                }`}
                type="button"
                onClick={() => onChooseRole(roleKey)}
              >
                {roleMeta.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-teal-100 bg-linear-to-r from-teal-50 to-emerald-50 p-4">
            <p className="text-sm font-semibold text-teal-900">
              Đang chọn: {selectedRoleMeta.label}
            </p>
            <p className="mt-1 text-sm text-teal-700">
              {selectedRoleMeta.hint}
            </p>
            <button
              className="mt-3 inline-flex items-center rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              type="button"
              onClick={onFillDemoAccount}
            >
              Điền nhanh tài khoản demo
            </button>
          </div>

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
