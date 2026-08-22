import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function VolunteerDashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (user.role !== "volunteer") {
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "volunteer") {
    return <div className="min-h-screen flex items-center justify-center bg-background text-on-background">Loading...</div>;
  }

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col pt-16">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-headline-md font-headline-md font-bold text-primary"
          >
            FloodGuard
          </Link>
          <span className="px-2 py-0.5 bg-primary-container text-on-primary-container rounded-full text-[10px] font-bold uppercase tracking-wider hidden sm:block">
            Volunteer Portal
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/profile" className="p-2 text-primary hover:opacity-80 transition-opacity active:scale-95 duration-100">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              account_circle
            </span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-lg">
        <header className="flex flex-col gap-stack-sm">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-surface">
            Welcome back, {user.fullName.split(" ")[0]} 🦸
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Thank you for volunteering to help the community. Here are the active incidents.
          </p>
        </header>

        <section className="bg-surface-container-low rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col items-center justify-center text-center gap-4 py-16">
          <span className="material-symbols-outlined text-6xl text-outline-variant">
            volunteer_activism
          </span>
          <h2 className="text-headline-md font-headline-md text-on-surface-variant">
            Volunteer Tools Coming Soon
          </h2>
          <p className="max-w-md">
            This dashboard will soon display assigned tasks, active emergency requests, and communication tools.
          </p>
        </section>
      </main>
    </div>
  );
}
