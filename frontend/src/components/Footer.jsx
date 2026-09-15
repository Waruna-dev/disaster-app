import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low dark:bg-inverse-surface border-t border-outline-variant mt-auto">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-start gap-8 md:gap-gutter">
        {/* Brand & Info */}
        <div className="flex flex-col gap-3 max-w-sm">
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
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant">
            Protecting communities through data-driven safety and real-time flood monitoring.
          </p>
          <p className="font-caption text-caption text-on-surface-variant dark:text-on-tertiary-fixed-variant mt-1">
            © {new Date().getFullYear()} FloodGuard Public Safety. All rights reserved.
          </p>
        </div>

        {/* Links Grid */}
        <div className="flex flex-wrap gap-8 sm:gap-12 md:gap-16">
          {/* Quick Links */}
          <div className="flex flex-col gap-2">
            <h4 className="font-label-md text-label-md font-bold text-on-surface dark:text-inverse-on-surface mb-1">
              Quick Links
            </h4>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/"
            >
              Home
            </Link>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/dashboard"
            >
              Flood Alerts
            </Link>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/report"
            >
              Report a Flood
            </Link>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/safety"
            >
              Safety Tips
            </Link>
          </div>

          {/* Resources & Legal */}
          <div className="flex flex-col gap-2">
            <h4 className="font-label-md text-label-md font-bold text-on-surface dark:text-inverse-on-surface mb-1">
              Resources & Legal
            </h4>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/privacy"
            >
              Privacy Policy
            </Link>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/terms"
            >
              Terms of Service
            </Link>
            <Link
              className="text-body-md font-body-md text-on-surface-variant dark:text-on-tertiary-fixed-variant hover:text-primary dark:hover:text-inverse-primary transition-colors"
              to="/contact"
            >
              Contact Support
            </Link>
          </div>

          {/* Emergency Callout */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            <h4 className="font-label-md text-label-md font-bold text-on-surface dark:text-inverse-on-surface mb-1">
              Emergency Contact
            </h4>
            <p className="font-caption text-caption text-on-surface-variant dark:text-on-tertiary-fixed-variant">
              If you or someone nearby is in immediate danger:
            </p>
            <a
              href="tel:911"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-error text-on-error rounded-lg font-label-md text-label-md font-semibold hover:opacity-90 transition-opacity w-fit shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              Call Emergency (911)
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

