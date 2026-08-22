import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const data = await loginUser({ email, password });
      login(data);
      if (data.role === "volunteer") {
        navigate("/volunteer-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to login. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-low text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Abstract Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              height="40"
              id="gridPattern"
              patternUnits="userSpaceOnUse"
              width="40"
            >
              <path
                className="text-primary"
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              ></path>
            </pattern>
          </defs>
          <rect fill="url(#gridPattern)" height="100%" width="100%"></rect>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-margin-mobile md:px-0">
        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="absolute -top-16 left-0 md:-left-16 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Home
        </Link>

        {/* Logo Area */}
        <div className="text-center mb-stack-lg mt-8 md:mt-0">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-headline-lg md:font-headline-lg-mobile text-headline-lg md:text-headline-lg-mobile font-bold text-primary flex items-center justify-center gap-2">
              <span
                className="material-symbols-outlined"
                data-icon="water_drop"
                data-weight="fill"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: "32px" }}
              >
                water_drop
              </span>
              FloodGuard
            </h1>
          </Link>
        </div>

        {/* Login Card */}
        <main className="glass-card rounded-xl p-stack-lg flex flex-col gap-stack-lg">
          <div className="text-center">
            <h2 className="font-headline-md text-headline-md font-bold mb-1">
              Welcome Back
            </h2>
            <p className="text-on-surface-variant">Log in to your account</p>
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-stack-md" onSubmit={handleLogin}>
            {/* Email Field */}
            <div>
              <label
                className="block font-label-md text-label-md text-on-surface-variant mb-unit"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    data-icon="mail"
                  >
                    mail
                  </span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface placeholder-outline min-h-[48px]"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-unit">
                <label
                  className="block font-label-md text-label-md text-on-surface-variant"
                  htmlFor="password"
                >
                  Password
                </label>
                <Link
                  className="font-label-md text-label-md text-primary hover:underline transition-all"
                  to="#"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    data-icon="lock"
                  >
                    lock
                  </span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md text-on-surface placeholder-outline min-h-[48px]"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="w-full h-12 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,74,198,0.2)]"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
              <span className="material-symbols-outlined text-sm">
                login
              </span>
            </button>
          </form>

          <div className="mt-stack-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Don't have an account?{" "}
              <Link
                className="text-primary font-semibold hover:underline transition-all"
                to="/register"
              >
                Register
              </Link>
            </p>
          </div>
        </main>

        {/* Simple Footer for transactional page */}
        <footer className="mt-stack-lg text-center opacity-70">
          <p className="font-caption text-caption text-on-surface-variant">
            © 2026 FloodGuard. Public Safety Information System.
          </p>
        </footer>
      </div>
    </div>
  );
}
