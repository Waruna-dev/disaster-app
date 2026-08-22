import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminAuthContext } from "../context/AdminAuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AdminAuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin/summary");
    } catch (err) {
      setError(err.message || "Failed to login. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-low text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="40" id="adminGridPattern" patternUnits="userSpaceOnUse" width="40">
              <path className="text-primary" d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
            </pattern>
          </defs>
          <rect fill="url(#adminGridPattern)" height="100%" width="100%"></rect>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-margin-mobile md:px-0">
        <Link to="/" className="absolute -top-16 left-0 md:-left-16 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Home
        </Link>

        <div className="text-center mb-stack-lg mt-8 md:mt-0">
          <div className="inline-flex flex-col items-center gap-1">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: "40px" }}
            >
              shield_person
            </span>
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary">
              FloodGuard Admin
            </h1>
            <p className="text-on-surface-variant text-sm">System Administrator Access</p>
          </div>
        </div>

        <main className="glass-card rounded-xl p-stack-lg flex flex-col gap-stack-lg">
          <div className="text-center">
            <h2 className="font-headline-md text-headline-md font-bold mb-1">Administrator Login</h2>
            <p className="text-on-surface-variant">Sign in to manage FloodGuard operations</p>
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-unit" htmlFor="admin-email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface placeholder-outline min-h-[48px]"
                  id="admin-email"
                  placeholder="admin@gmail.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-unit" htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface placeholder-outline min-h-[48px]"
                  id="admin-password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              className="w-full h-12 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,74,198,0.2)] disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login to Dashboard"}
              <span className="material-symbols-outlined text-sm">login</span>
            </button>
          </form>
        </main>

        <footer className="mt-stack-lg text-center opacity-70">
          <p className="font-caption text-caption text-on-surface-variant">
            © 2026 FloodGuard. Administrator Console.
          </p>
        </footer>
      </div>
    </div>
  );
}
