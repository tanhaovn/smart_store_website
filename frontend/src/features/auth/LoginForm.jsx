export default function LoginForm({
  loading,
  form,
  role,
  onRoleChange,
  onFormChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-teal-800">Vai tro</span>
        <select
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
        >
          <option value="USER">Nguoi mua</option>
          <option value="SELLER">Nguoi ban</option>
          <option value="ADMIN">Admin</option>
          <option value="DELIVERY">Nhan don giao hang</option>
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-teal-800">Email</span>
        <input
          type="email"
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          value={form.email}
          onChange={(event) => onFormChange("email", event.target.value)}
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-teal-800">Mat khau</span>
        <input
          type="password"
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          value={form.password}
          onChange={(event) => onFormChange("password", event.target.value)}
          required
        />
      </label>
      <button
        disabled={loading}
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Dang xu ly..." : "Dang nhap"}
      </button>
    </form>
  );
}
