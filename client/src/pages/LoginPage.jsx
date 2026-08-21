import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth-context";

const demoAccounts = [
  { label: "Member Demo", email: "sarah@example.com", password: "Faithful123!" },
  { label: "Admin Demo", email: "admin@example.com", password: "AdminFaith123!" },
];

export default function LoginPage() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(demoAccounts[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to={user?.roles?.includes("admin") ? "/admin" : "/member"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const result = await login(form);
      navigate(result.user.roles.includes("admin") ? "/admin" : "/member");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2d7_0,#f7f1e5_36%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[88vh] max-w-6xl overflow-hidden rounded-[40px] border border-white/80 bg-white/70 shadow-[0_35px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between bg-slate-900 px-8 py-8 text-white md:px-12 md:py-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">The School Of Faith</p>
            <h1 className="mt-6 max-w-xl font-serif text-5xl leading-tight">
              Member dashboard and pastoral care in one connected space.
            </h1>
            <p className="mt-6 max-w-lg text-base text-slate-300">
              Live course progress, event attendance, certificates, giving history, saved messages, and prayer requests.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => setForm(account)}
                className="rounded-[28px] border border-white/15 bg-white/5 p-5 text-left transition hover:bg-white/10"
              >
                <p className="text-sm font-semibold">{account.label}</p>
                <p className="mt-2 text-xs text-slate-400">{account.email}</p>
                <p className="mt-1 text-xs text-slate-500">{account.password}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center px-6 py-10 md:px-10">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-amber-700">Welcome Back</p>
              <h2 className="mt-3 font-serif text-4xl text-slate-900">Sign in</h2>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
