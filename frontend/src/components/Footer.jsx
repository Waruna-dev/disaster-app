import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full py-stack-lg px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-stack-md bg-surface-container-low dark:bg-inverse-surface mt-auto">
      <div className="text-headline-md font-headline-md text-on-surface dark:text-inverse-on-surface">
        FloodGuard
      </div>
      <div className="flex flex-wrap justify-center gap-gutter">
        <Link
          className="text-on-surface-variant dark:text-on-tertiary-fixed-variant text-label-md font-label-md hover:text-primary dark:hover:text-primary-fixed underline transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          to="/privacy"
        >
          Privacy Policy
        </Link>
        <Link
          className="text-on-surface-variant dark:text-on-tertiary-fixed-variant text-label-md font-label-md hover:text-primary dark:hover:text-primary-fixed underline transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          to="/terms"
        >
          Terms of Service
        </Link>
        <Link
          className="text-on-surface-variant dark:text-on-tertiary-fixed-variant text-label-md font-label-md hover:text-primary dark:hover:text-primary-fixed underline transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          to="/contact"
        >
          Contact Support
        </Link>
        <Link
          className="text-on-surface-variant dark:text-on-tertiary-fixed-variant text-label-md font-label-md hover:text-primary dark:hover:text-primary-fixed underline transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          to="/emergency"
        >
          Emergency Protocol
        </Link>
      </div>
      <div className="text-caption font-caption text-on-surface-variant dark:text-on-tertiary-fixed-variant">
        © 2026 FloodGuard Public Safety. All rights reserved.
      </div>
    </footer>
  );
}
