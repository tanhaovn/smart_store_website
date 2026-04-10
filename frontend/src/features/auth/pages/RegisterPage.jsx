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
      const data = await requestRegisterOtp(payload);
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
    <main className="auth-page">
      <section className="auth-card">
        <h1>Smart Vision Shop</h1>
        <p className="subtitle">Dang ky tai khoan khach hang bang OTP</p>

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

        <p className="auth-switch">
          Da co tai khoan? <Link to="/login">Dang nhap</Link>
        </p>

        {notice && <p className="notice">{notice}</p>}
      </section>
    </main>
  );
}
