export default function RegisterForm({
  loading,
  registerForm,
  otpCode,
  otpSent,
  canSendOtp,
  onRegisterFieldChange,
  onOtpCodeChange,
  onSendOtp,
  onVerifyOtp,
}) {
  return (
    <>
      <form onSubmit={onSendOtp} className="auth-form">
        <label>
          Ho va ten
          <input
            type="text"
            value={registerForm.full_name}
            onChange={(event) =>
              onRegisterFieldChange("full_name", event.target.value)
            }
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={registerForm.email}
            onChange={(event) =>
              onRegisterFieldChange("email", event.target.value)
            }
            required
          />
        </label>
        <label>
          So dien thoai
          <input
            type="tel"
            value={registerForm.phone}
            onChange={(event) =>
              onRegisterFieldChange("phone", event.target.value)
            }
          />
        </label>
        <label>
          Mat khau (toi thieu 8 ky tu)
          <input
            type="password"
            value={registerForm.password}
            onChange={(event) =>
              onRegisterFieldChange("password", event.target.value)
            }
            required
          />
        </label>
        <button
          disabled={loading || !canSendOtp}
          type="submit"
          className="primary-btn"
        >
          {loading ? "Dang gui OTP..." : "Gui OTP"}
        </button>
      </form>

      {otpSent && (
        <form onSubmit={onVerifyOtp} className="auth-form otp-form">
          <label>
            Nhap OTP da gui ve so dien thoai
            <input
              type="text"
              value={otpCode}
              onChange={(event) => onOtpCodeChange(event.target.value)}
              maxLength={6}
              required
            />
          </label>
          <button
            disabled={loading || otpCode.trim().length !== 6}
            type="submit"
            className="primary-btn"
          >
            {loading ? "Dang xac thuc..." : "Xac thuc OTP va Dang ky"}
          </button>
        </form>
      )}
    </>
  );
}
