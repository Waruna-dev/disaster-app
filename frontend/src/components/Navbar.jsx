import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  
  const getDesktopLinkClass = (path) => {
    const baseClass = "transition-colors text-label-md font-label-md hover:opacity-80 active:scale-95 duration-100";
    if (isActive(path)) {
      return `${baseClass} text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed pb-1`;
    }
    return `${baseClass} text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed`;
  };

  const getMobileLinkClass = (path) => {
    if (isActive(path)) {
      return "text-primary dark:text-primary-fixed font-bold font-label-md text-label-md";
    }
    return "text-secondary dark:text-secondary-fixed-dim font-medium font-label-md text-label-md";
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface-container-lowest dark:bg-surface-dim shadow-sm dark:shadow-none shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-headline-md font-headline-md font-bold text-primary dark:text-primary-fixed"
        >
          FloodGuard
        </Link>
      </div>
      <div className="hidden md:flex items-center gap-gutter">
        <Link className={getDesktopLinkClass("/")} to="/">
          Home
        </Link>
        <Link className={getDesktopLinkClass("/dashboard")} to="/dashboard">
          Dashboard
        </Link>
        <Link className={getDesktopLinkClass("/report")} to="/report">
          Report
        </Link>
        <Link className={getDesktopLinkClass("/map")} to="/dashboard">
          Map
        </Link>
        <Link className={getDesktopLinkClass("/safety")} to="/safety">
          Safety Info
        </Link>
      </div>
      <div className="flex items-center gap-2">
        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-primary dark:text-primary-fixed"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="material-symbols-outlined">
            {isMenuOpen ? "close" : "menu"}
          </span>
        </button>
        
        <Link to="/profile" className="p-2 text-primary dark:text-primary-fixed hover:opacity-80 transition-opacity active:scale-95 duration-100">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            account_circle
          </span>
        </Link>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-surface-container-lowest border-t border-outline-variant shadow-lg flex flex-col p-4 gap-4 z-40">
          <Link
            className={getMobileLinkClass("/")}
            to="/"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            className={getMobileLinkClass("/dashboard")}
            to="/dashboard"
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            className={getMobileLinkClass("/report")}
            to="/report"
            onClick={() => setIsMenuOpen(false)}
          >
            Report
          </Link>
          <Link
            className={getMobileLinkClass("/map")}
            to="/dashboard"
            onClick={() => setIsMenuOpen(false)}
          >
            Map
          </Link>
          <Link
            className={getMobileLinkClass("/safety")}
            to="/safety"
            onClick={() => setIsMenuOpen(false)}
          >
            Safety Info
          </Link>
        </div>
      )}
    </nav>
  );
}
