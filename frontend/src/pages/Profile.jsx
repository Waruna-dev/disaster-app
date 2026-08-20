import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low text-on-surface">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col items-center justify-center relative p-margin-mobile md:p-margin-desktop">
      {/* Decorative background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              height="40"
              id="gridPatternProfile"
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
          <rect fill="url(#gridPatternProfile)" height="100%" width="100%"></rect>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="absolute -top-12 left-0 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
          Back to Dashboard
        </Link>

        {/* Profile Card */}
        <main className="glass-card rounded-xl p-stack-lg flex flex-col items-center gap-stack-lg shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant">
          {/* Avatar Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center text-primary shadow-sm">
              <span
                className="material-symbols-outlined text-[48px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold mt-2">
              {user.fullName}
            </h1>
            <p className="text-on-surface-variant">{user.email}</p>
          </div>

          <hr className="w-full border-outline-variant" />

          {/* User Details */}
          <div className="w-full flex flex-col gap-4">
            <div>
              <span className="block text-caption font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Account ID
              </span>
              <span className="font-mono text-sm text-on-surface">
                {user._id}
              </span>
            </div>
            <div>
              <span className="block text-caption font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Role
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-highest text-on-surface rounded-full text-sm font-medium capitalize">
                <span className="material-symbols-outlined text-[16px]">
                  {user.role === 'volunteer' ? 'volunteer_activism' : 'verified_user'}
                </span>
                {user.role || 'Resident'}
              </span>
            </div>
          </div>

          <hr className="w-full border-outline-variant" />

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="w-full h-12 bg-error text-on-error rounded-lg font-label-md font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(186,26,26,0.2)]"
            >
              <span className="material-symbols-outlined text-[20px]">
                logout
              </span>
              Log Out
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
