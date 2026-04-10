export default function LoginForm({ loading, form, onFormChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      <label>
        Email
        <input
          type="email"
          value={form.email}
          onChange={(event) => onFormChange("email", event.target.value)}
          required
        />
      </label>
      <label>
        Mat khau
        <input
          type="password"
          value={form.password}
          onChange={(event) => onFormChange("password", event.target.value)}
          required
        />
      </label>
      <button disabled={loading} type="submit" className="primary-btn">
        {loading ? "Dang xu ly..." : "Dang nhap"}
      </button>
    </form>
  );
}
