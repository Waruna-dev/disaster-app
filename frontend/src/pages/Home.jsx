import { useState } from "react";
import { Link } from "react-router-dom";
import AnnouncementsSection from "../components/AnnouncementsSection";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* TopNavBar Component */}
      <nav className="sticky top-0 z-50 shadow-sm dark:shadow-none bg-surface-container-lowest dark:bg-surface-container-lowest w-full">
        <div className="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-20">
          {/* Brand */}
          <Link
            className="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary flex items-center gap-2"
            to="/"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              water_drop
            </span>
            FloodGuard
          </Link>
          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-gutter">
            <Link
              className="text-primary dark:text-inverse-primary font-bold border-b-2 border-primary dark:border-inverse-primary pb-1 font-label-md text-label-md hover:text-primary dark:hover:text-inverse-primary transition-colors duration-200"
              to="/"
            >
              Home
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-medium font-label-md text-label-md hover:text-primary dark:hover:text-inverse-primary transition-colors duration-200"
              to="/dashboard"
            >
              Flood Alerts
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-medium font-label-md text-label-md hover:text-primary dark:hover:text-inverse-primary transition-colors duration-200"
              to="/safety"
            >
              Safety Tips
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-medium font-label-md text-label-md hover:text-primary dark:hover:text-inverse-primary transition-colors duration-200"
              to="/about"
            >
              About
            </Link>
          </div>
          {/* Actions */}
          <div className="hidden md:flex items-center gap-stack-md">
            <Link to="/login">
              <button className="px-4 py-2 border border-primary text-primary rounded-full font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors">
                Login
              </button>
            </Link>
            <Link to="/register">
              <button className="px-4 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
                Register
              </button>
            </Link>
          </div>
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-on-surface p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-symbols-outlined">
              {isMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-surface-container-lowest border-t border-outline-variant shadow-lg flex flex-col p-4 gap-4 z-40">
            <Link
              className="text-primary font-bold font-label-md text-label-md"
              to="/"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              className="text-on-surface-variant font-medium font-label-md text-label-md"
              to="/dashboard"
              onClick={() => setIsMenuOpen(false)}
            >
              Flood Alerts
            </Link>
            <Link
              className="text-on-surface-variant font-medium font-label-md text-label-md"
              to="/safety"
              onClick={() => setIsMenuOpen(false)}
            >
              Safety Tips
            </Link>
            <Link
              className="text-on-surface-variant font-medium font-label-md text-label-md"
              to="/about"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-outline-variant">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full px-4 py-2 border border-primary text-primary rounded-full font-label-md text-label-md">
                  Login
                </button>
              </Link>
              <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full px-4 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md">
                  Register
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>
      <main>
        {/* Hero Section */}
        <section className="relative pt-stack-lg pb-16 lg:pt-24 lg:pb-32 overflow-hidden bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-desktop flex flex-col lg:flex-row items-center gap-stack-lg">
            <div className="flex-1 space-y-stack-md z-10 text-center lg:text-left">
              <h1 className="font-display-lg text-display-lg text-on-surface">
                Stay Alert. <br />
                <span className="text-primary">Stay Safe.</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto lg:mx-0">
                FloodGuard helps residents stay informed about flood warnings and
                report flood situations in their local area.
              </p>
              <div className="flex flex-col sm:flex-row gap-stack-md justify-center lg:justify-start pt-4">
                <Link to="/dashboard">
                  <button className="px-6 py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      warning
                    </span>
                    View Flood Alerts
                  </button>
                </Link>
                <Link to="/report">
                  <button className="px-6 py-3 bg-surface text-primary border border-primary rounded-full font-label-md text-label-md hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">campaign</span>
                    Report a Flood
                  </button>
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none relative z-10">
              <div className="relative rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.05)] aspect-[4/3]">
                <img
                  alt="Illustration of a neighborhood protected from flooding with alerts and safety shields"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIkOjNN7QwBYhIYbd4Udiu_cTCAmYep8815940A13Ma0viXPKfaArIJ3S-EiGEFrfC0joZt48PES2CaTNKSlrKzglE9c32m_RtVnr6AGyar8KqIvUmG-Ebc_PG6xMBGQh39ULfT30RkOPLdg8SAXe3NrpX19aSq_vTTzKEW_Ap8J1eJHwLl9HsVX29MofaL8gdeW5D7yeA7c9KvGdwxpISq7WqUY4Oj8QDoqTCw0oeO04m5bRKB6AJ"
                />
              </div>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob z-0"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-secondary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 z-0"></div>
        </section>
        {/* Current Flood Alert Section */}
        <section className="py-stack-lg lg:py-24 bg-surface">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="flex items-center justify-between mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface">
                Current Flood Alerts
              </h2>
              <Link
                className="hidden md:flex text-primary font-label-md text-label-md hover:underline items-center gap-1"
                to="/dashboard"
              >
                View All{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* High Risk Card */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col h-full hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">
                      error
                    </span>
                    High Risk
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Kelaniya Area
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-6">
                  Heavy flooding has been reported in several locations. Residents
                  are advised to remain alert.
                </p>
                <button className="w-full py-2.5 border border-outline-variant rounded-lg text-primary font-label-md text-label-md hover:bg-surface-variant transition-colors mt-auto">
                  View Details
                </button>
              </div>
              {/* Medium Risk Card */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col h-full hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffeed2] text-[#8c5000] font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">
                      warning
                    </span>
                    Medium Risk
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Kaduwela Area
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-6">
                  Water levels are increasing due to continued rainfall.
                </p>
                <button className="w-full py-2.5 border border-outline-variant rounded-lg text-primary font-label-md text-label-md hover:bg-surface-variant transition-colors mt-auto">
                  View Details
                </button>
              </div>
              {/* Low Risk Card */}
              <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant flex flex-col h-full hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2f8d2] text-[#005000] font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">
                      info
                    </span>
                    Low Risk
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Malabe Area
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant flex-grow mb-6">
                  Minor flooding has been reported in several roads.
                </p>
                <button className="w-full py-2.5 border border-outline-variant rounded-lg text-primary font-label-md text-label-md hover:bg-surface-variant transition-colors mt-auto">
                  View Details
                </button>
              </div>
            </div>
            <div className="mt-stack-md text-center md:hidden">
              <Link
                className="inline-flex text-primary font-label-md text-label-md hover:underline items-center gap-1"
                to="/dashboard"
              >
                View All Alerts{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>
        {/* Community Announcements (published by FloodGuard Admins) */}
        <AnnouncementsSection />
        {/* How FloodGuard Works */}
        <section className="py-stack-lg lg:py-24 bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center">
            <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-surface mb-stack-lg">
              How FloodGuard Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* Step 1 */}
              <div className="flex flex-col items-center p-6 bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
                  <span
                    className="material-symbols-outlined text-[32px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    notifications_active
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  View Alerts
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-center">
                  Residents can check current flood warnings in their area.
                </p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center p-6 bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] relative mt-8 md:mt-0">
                {/* Decorative line connecting steps on desktop */}
                <div className="hidden md:block absolute top-14 -left-1/2 w-full h-px bg-outline-variant border-dashed border-t border-outline-variant -z-10"></div>
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
                  <span
                    className="material-symbols-outlined text-[32px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    report
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Report Flooding
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-center">
                  Residents can submit a flood report with location, severity, and
                  description.
                </p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center p-6 bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] relative mt-8 md:mt-0">
                {/* Decorative line connecting steps on desktop */}
                <div className="hidden md:block absolute top-14 -left-1/2 w-full h-px bg-outline-variant border-dashed border-t border-outline-variant -z-10"></div>
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
                  <span
                    className="material-symbols-outlined text-[32px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    update
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Stay Informed
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-center">
                  Verified alerts and updates are displayed for residents.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Bento Grid for CTA, Tips, About */}
        <section className="py-stack-lg lg:py-24 bg-surface">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter auto-rows-min">
              {/* Report Flood CTA (Spans 1 col, high visual weight) */}
              <div className="lg:col-span-1 bg-primary text-on-primary rounded-2xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <h2 className="font-headline-md text-headline-md mb-2">
                    See Flooding in Your Area?
                  </h2>
                  <p className="font-body-md text-body-md opacity-90 mb-6">
                    Help your community by reporting flood situations through
                    FloodGuard.
                  </p>
                  <Link to="/report">
                    <button className="w-full py-3 bg-surface text-primary rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors shadow-sm flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">
                        add_location
                      </span>
                      Report a Flood
                    </button>
                  </Link>
                </div>
              </div>
              {/* Flood Safety Tips (Spans 2 cols) */}
              <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    health_and_safety
                  </span>
                  Flood Safety Tips
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-primary mt-0.5">
                      no_transfer
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Avoid walking or driving through flooded roads.
                    </span>
                  </li>
                  <li className="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-primary mt-0.5">
                      landscape
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Move to higher ground when instructed.
                    </span>
                  </li>
                  <li className="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-primary mt-0.5">
                      cell_tower
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Follow official emergency warnings and instructions.
                    </span>
                  </li>
                </ul>
              </div>
              {/* About FloodGuard (Spans all cols) */}
              <div className="lg:col-span-3 bg-surface-container-highest rounded-2xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] text-center max-w-4xl mx-auto w-full">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                  About FloodGuard
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  FloodGuard is a simple community-based flood warning and
                  reporting web application. Designed to empower local residents,
                  it provides real-time alerts and crowd-sourced situational data
                  to ensure everyone stays prepared and safe during extreme
                  weather events.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/* Footer Component */}
      <footer className="w-full py-stack-lg px-margin-desktop max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-start gap-stack-md bg-surface-container dark:bg-surface-container-high border-t border-outline-variant mt-12">
        <div className="flex flex-col gap-4 max-w-sm">
          <Link
            className="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary flex items-center gap-2"
            to="/"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              water_drop
            </span>
            FloodGuard
          </Link>
          <p className="font-caption text-caption text-on-surface dark:text-on-surface-variant">
            © 2026 FloodGuard. All rights reserved. Protecting communities
            through data-driven safety.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-label-md text-label-md font-bold text-on-surface dark:text-on-surface-variant mb-2">
            Quick Links
          </h4>
          <div className="flex flex-col gap-2">
            <Link
              className="text-primary dark:text-inverse-primary font-bold font-body-md text-body-md hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/"
            >
              Home
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-body-md text-body-md hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/dashboard"
            >
              Flood Alerts
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-body-md text-body-md hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/safety"
            >
              Safety Tips
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-body-md text-body-md hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/about"
            >
              About
            </Link>
            <Link
              className="text-on-surface-variant dark:text-outline-variant font-body-md text-body-md hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/contact"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
