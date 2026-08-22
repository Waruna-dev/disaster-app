import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ResidentDashboard() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (user.role !== "resident") {
        // If they are not a resident (e.g. a volunteer), redirect them
        // For now, redirect to profile until a volunteer dashboard exists
        navigate("/profile");
      }
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "resident") {
    return <div className="min-h-screen flex items-center justify-center bg-background text-on-background">Loading...</div>;
  }

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col pt-16">
      <Navbar />

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-stack-lg">
        {/* Welcome Section */}
        <header className="flex flex-col gap-stack-sm">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-surface">
            Welcome back, {user.fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Stay informed about flood conditions and help keep your community
            safe.
          </p>
        </header>

        {/* Active Flood Alert */}
        <section className="bg-error-container rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-[#ffb4ab]">
          <div className="flex items-start gap-stack-md">
            <div className="bg-error text-on-error p-2 rounded-full flex-shrink-0 mt-1">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
            <div className="flex flex-col gap-stack-sm flex-grow">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-headline-md font-headline-md text-on-error-container">
                  Medium Risk - Kelaniya Area
                </h2>
                <span className="px-3 py-1 bg-[#ffb4ab] text-[#93000a] text-caption font-caption rounded-full font-bold">
                  Severity: Medium
                </span>
              </div>
              <p className="text-body-md font-body-md text-on-error-container">
                Water levels are rising due to continued rainfall. Residents are
                advised to remain alert and avoid flooded roads.
              </p>
              <Link
                className="text-error font-label-md text-label-md font-bold mt-2 hover:underline inline-flex items-center gap-1 w-max"
                to="/dashboard"
              >
                View Alert Details{" "}
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Report Card */}
          <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col gap-stack-md justify-between hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex flex-col gap-stack-sm">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md text-on-surface">
                Report an Incident
              </h3>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Report flooding or another emergency situation in your area.
              </p>
            </div>
            <Link to="/report">
              <button className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98]">
                Report Now
              </button>
            </Link>
          </div>

          {/* Map Card */}
          <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col gap-stack-md justify-between hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex flex-col gap-stack-sm">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md text-on-surface">
                View Flood Map
              </h3>
              <p className="text-body-md font-body-md text-on-surface-variant">
                View reported flood and incident locations nearby.
              </p>
            </div>
            <button className="w-full bg-surface-container text-primary-container font-label-md text-label-md py-3 rounded-lg hover:bg-surface-container-high transition-colors active:scale-[0.98]">
              View Map
            </button>
          </div>

          {/* Safety Card */}
          <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col gap-stack-md justify-between hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex flex-col gap-stack-sm">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  health_and_safety
                </span>
              </div>
              <h3 className="text-headline-md font-headline-md text-on-surface">
                Safety Information
              </h3>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Read important flood safety and emergency instructions.
              </p>
            </div>
            <Link to="/safety">
              <button className="w-full bg-surface-container text-primary-container font-label-md text-label-md py-3 rounded-lg hover:bg-surface-container-high transition-colors active:scale-[0.98]">
                View Safety Tips
              </button>
            </Link>
          </div>
        </section>

        {/* Asymmetric Layout: Reports & Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* My Recent Reports */}
          <section className="lg:col-span-2 flex flex-col gap-stack-md">
            <div className="flex justify-between items-end">
              <h2 className="text-headline-md font-headline-md text-on-surface">
                My Recent Reports
              </h2>
              <Link
                className="text-primary font-label-md text-label-md hover:underline"
                to="/dashboard"
              >
                View All Reports →
              </Link>
            </div>
            <div className="flex flex-col gap-stack-sm">
              {/* Report Row 1 */}
              <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-stack-sm">
                <div className="flex flex-col">
                  <span className="text-body-md font-body-md font-bold text-on-surface">
                    Flood | Kelaniya
                  </span>
                  <span className="text-caption font-caption text-on-surface-variant">
                    August 20, 2026 • Medium Severity
                  </span>
                </div>
                <div className="px-3 py-1 bg-[#bdf0d4] text-[#006b54] rounded-full text-caption font-caption font-bold border border-[#006b54]/20">
                  Verified
                </div>
              </div>
              {/* Report Row 2 */}
              <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-stack-sm">
                <div className="flex flex-col">
                  <span className="text-body-md font-body-md font-bold text-on-surface">
                    Road Block | Malabe
                  </span>
                  <span className="text-caption font-caption text-on-surface-variant">
                    August 18, 2026 • Low Severity
                  </span>
                </div>
                <div className="px-3 py-1 bg-[#ffe082] text-[#ff8f00] rounded-full text-caption font-caption font-bold border border-[#ff8f00]/20">
                  Pending
                </div>
              </div>
            </div>
          </section>

          {/* Safety Reminder & Emergency */}
          <div className="flex flex-col gap-gutter">
            {/* Safety Reminder */}
            <section className="bg-surface-container-low rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-primary-fixed flex flex-col gap-stack-md">
              <div className="flex items-center gap-2 text-primary-container">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  security
                </span>
                <h3 className="text-headline-md font-headline-md">
                  Safety Reminder
                </h3>
              </div>
              <p className="text-body-md font-body-md text-on-surface">
                Never walk or drive through flood water. Move to higher ground if
                water levels continue to rise.
              </p>
              <Link
                className="text-primary font-label-md text-label-md hover:underline w-max"
                to="/safety"
              >
                More Safety Tips →
              </Link>
            </section>
            {/* Emergency Section */}
            <section className="bg-error-container rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(0,0,0,0.05)] flex flex-col gap-stack-sm items-center text-center">
              <h3 className="text-headline-md font-headline-md text-on-error-container">
                Need Immediate Help?
              </h3>
              <p className="text-caption font-caption text-on-error-container mb-2">
                Contact emergency services if you or someone nearby is in
                immediate danger.
              </p>
              <a
                href="tel:911"
                className="w-full bg-error text-on-error font-label-md text-label-md py-3 rounded-lg hover:bg-[#93000a] transition-colors active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">call</span>{" "}
                Emergency Call
              </a>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
