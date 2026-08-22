import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AdminAuthContext } from "../context/AdminAuthContext";

const NAV_ITEMS = [
  { to: "/admin/summary", icon: "dashboard", label: "Summary" },
  { to: "/admin/pending-reports", icon: "fact_check", label: "Pending Reports" },
  { to: "/admin/disaster-map", icon: "map", label: "Disaster Monitoring Map" },
  { to: "/admin/volunteer-management", icon: "groups", label: "Volunteer Management" },
  { to: "/admin/volunteer-tasks", icon: "assignment_ind", label: "Volunteer Task Management" },
  { to: "/admin/announcements", icon: "campaign", label: "Create Announcement" },
];

export default function AdminLayout() {
  const { logout, admin } = useContext(AdminAuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const SidebarContent = (
    <>
      <div className="px-6 py-7 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: "28px" }}
          >
            water_drop
          </span>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">FloodGuard</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-label-md transition-colors ${
                isActive
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-outline-variant/60">
        <div className="mb-3 px-2">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide font-label-md">Signed in as</p>
          <p className="text-sm font-semibold text-on-surface truncate">{admin?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-error text-error hover:bg-error hover:text-white transition-colors font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-surface-container-low">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-surface-container-lowest border-r border-outline-variant/60 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-72 max-w-[80%] bg-surface-container-lowest h-full flex flex-col shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-16 bg-surface-container-lowest border-b border-outline-variant/60 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-on-surface">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary">FloodGuard Admin</span>
          <div className="w-9" />
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
