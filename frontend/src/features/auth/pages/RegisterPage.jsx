import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterForm from "../RegisterForm";
import { requestRegisterOtp, verifyRegisterOtp } from "../api";
import { getHomePathForRole } from "../routing";
import { useAuth } from "../useAuth";

const initialRegisterForm = {
  email: "",
  full_name: "",
  phone: "",
  password: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const canSendOtp = useMemo(() => {
    return (
      registerForm.email.trim() &&
      registerForm.full_name.trim() &&
      registerForm.password.length >= 8
    );
  }, [registerForm]);

  const onSendOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const payload = {
        email: registerForm.email,
        full_name: registerForm.full_name,
        phone: registerForm.phone,
        password: registerForm.password,
      };
      await requestRegisterOtp(payload);
      setOtpSent(true);
      setNotice(
        `OTP da duoc gui toi so ${registerForm.phone}. Vui long nhap OTP de hoan tat.`,
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const data = await verifyRegisterOtp({
        email: registerForm.email,
        phone: registerForm.phone,
        otp: otpCode,
      });
      login(data.access_token, data.user);
      setNotice("Dang ky thanh cong.");
      setOtpCode("");
      setOtpSent(false);
      setRegisterForm(initialRegisterForm);
      navigate(getHomePathForRole(data.user?.role), { replace: true });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
        <h1 className="text-2xl font-extrabold text-teal-900 md:text-3xl">
          Smart Vision Shop
        </h1>
        <p className="mt-2 text-sm text-teal-700">
          Dang ky tai khoan khach hang bang OTP
        </p>
        <div className="mt-4 rounded-2xl border border-teal-100 bg-linear-to-r from-teal-50 to-emerald-50 p-4">
          <p className="text-sm font-semibold text-teal-900">
            Luu y phan quyen
          </p>
          <p className="mt-1 text-sm text-teal-700">
            Dang ky tao tai khoan nguoi mua (USER). Tai khoan ADMIN, SELLER va
            DELIVERY duoc cap boi quan tri he thong.
          </p>
        </div>

        <RegisterForm
          loading={loading}
          registerForm={registerForm}
          otpCode={otpCode}
          otpSent={otpSent}
          canSendOtp={canSendOtp}
          onRegisterFieldChange={(field, value) =>
            setRegisterForm((prev) => ({
              ...prev,
              [field]: value,
            }))
          }
          onOtpCodeChange={setOtpCode}
          onSendOtp={onSendOtp}
          onVerifyOtp={onVerifyOtp}
        />

        <p className="mt-4 text-sm text-slate-600">
          Da co tai khoan?{" "}
          <Link
            className="font-semibold text-teal-600 hover:text-teal-700"
            to="/login"
          >
            Dang nhap
          </Link>
        </p>

        {notice && (
          <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
