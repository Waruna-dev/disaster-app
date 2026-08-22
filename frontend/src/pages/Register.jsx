import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("resident");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser({ fullName, email, password, role });
      login(data);
      if (data.role === "volunteer") {
        navigate("/volunteer-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-low min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop text-on-surface antialiased">
      {/* Registration Card */}
      <main className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant w-full max-w-md p-stack-lg flex flex-col gap-stack-lg relative overflow-hidden mt-8 md:mt-0">
        {/* Decorative Header */}
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>

        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md z-20"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back
        </Link>

        {/* Header */}
        <header className="text-center flex flex-col gap-stack-sm mt-4">
          {/* Brand Logo */}
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center gap-2 mb-2 text-primary">
              <span
                className="material-symbols-outlined text-4xl"
                data-weight="fill"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                flood
              </span>
              <span className="font-headline-md text-headline-md font-bold tracking-tight">
                FloodGuard
              </span>
            </div>
          </Link>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Create an Account
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Join FloodGuard to help protect your community.
          </p>
        </header>

        {error && (
          <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-sm font-medium border border-[#ffb4ab]">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-stack-md" onSubmit={handleRegister}>
          {/* Full Name Field */}
          <div className="flex flex-col gap-1">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="fullName"
            >
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">
                  person
                </span>
              </div>
              <input
                className="w-full h-12 pl-10 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors"
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
              <input
                className="w-full h-12 pl-10 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors"
                id="email"
                name="email"
                placeholder="john@example.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">lock</span>
              </div>
              <input
                className="w-full h-12 pl-10 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors"
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

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1">
            <label
              className="font-label-md text-label-md text-on-surface"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">
                  lock_reset
                </span>
              </div>
              <input
                className="w-full h-12 pl-10 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md text-on-surface transition-colors"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="font-label-md text-label-md text-on-surface">
              I am joining as a...
            </span>
            <div className="grid grid-cols-2 gap-4">
              <label 
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${role === "resident" ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface-container-lowest text-on-surface"}`}
              >
                <input 
                  type="radio" 
                  name="role" 
                  value="resident" 
                  checked={role === "resident"}
                  onChange={() => setRole("resident")}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[20px]">home</span>
                <span className="font-label-md font-semibold">Resident</span>
              </label>
              
              <label 
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${role === "volunteer" ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface-container-lowest text-on-surface"}`}
              >
                <input 
                  type="radio" 
                  name="role" 
                  value="volunteer" 
                  checked={role === "volunteer"}
                  onChange={() => setRole("volunteer")}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
                <span className="font-label-md font-semibold">Volunteer</span>
              </label>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-2 mt-2">
            <div className="flex items-center h-5">
              <input
                className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary focus:ring-2"
                id="terms"
                name="terms"
                required
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
            </div>
            <label
              className="font-body-md text-caption text-on-surface-variant"
              htmlFor="terms"
            >
              I agree to the{" "}
              <Link className="text-primary hover:underline font-medium" to="#">
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link className="text-primary hover:underline font-medium" to="#">
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          {/* Submit Button */}
          <button
            className="mt-4 w-full h-12 bg-primary-container text-on-primary rounded-lg font-label-md text-label-md font-semibold hover:bg-primary transition-colors shadow-[0_4px_14px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] active:scale-[0.98] flex justify-center items-center gap-2"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-4 border-t border-outline-variant">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Already have an account?{" "}
            <Link
              className="text-primary font-semibold hover:underline transition-all"
              to="/login"
            >
              Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
