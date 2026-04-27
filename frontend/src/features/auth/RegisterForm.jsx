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
      <form onSubmit={onSendOtp} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-teal-800">Họ và tên</span>
          <input
            type="text"
            className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            value={registerForm.full_name}
            onChange={(event) =>
              onRegisterFieldChange("full_name", event.target.value)
            }
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-teal-800">Email</span>
          <input
            type="email"
            className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            value={registerForm.email}
            onChange={(event) =>
              onRegisterFieldChange("email", event.target.value)
            }
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-teal-800">
            Số điện thoại
          </span>
          <input
            type="tel"
            className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            value={registerForm.phone}
            onChange={(event) =>
              onRegisterFieldChange("phone", event.target.value)
            }
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-teal-800">
            Mật khẩu (tối thiểu 8 ký tự)
          </span>
          <input
            type="password"
            className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
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
          className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang gửi OTP..." : "Gửi OTP"}
        </button>
      </form>

      {otpSent && (
        <form
          onSubmit={onVerifyOtp}
          className="mt-4 space-y-4 rounded-2xl border border-teal-100 bg-teal-50/80 p-4"
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-teal-800">
              Nhập OTP đã gửi về số điện thoại
            </span>
            <input
              type="text"
              className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              value={otpCode}
              onChange={(event) => onOtpCodeChange(event.target.value)}
              maxLength={6}
              required
            />
          </label>
          <button
            disabled={loading || otpCode.trim().length !== 6}
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang xác thực..." : "Xác thực OTP và Đăng ký"}
          </button>
        </form>
      )}
    </>
  );
}
