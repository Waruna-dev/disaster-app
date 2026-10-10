import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, Bell, Building2, ChevronDown, Home, LogOut, Menu, Package, Settings, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/hazard-alerts', label: 'Hazard Alerts', icon: AlertTriangle },
  { to: '/shelters', label: 'Shelters', icon: Building2, badge: 'shelter' },
  { to: '/rescue-teams', label: 'Rescue Teams', icon: Users, badge: 'rescue' },
  { to: '/resources', label: 'Resources', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { profile, user, logout } = useAuth();
  const { shelterRequests, rescueRequests, permissionDenied } = useData();
  const { confirm } = useUI();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<'bell' | 'user' | null>(null);
  useEffect(() => { setDrawer(false); setMenu(null); }, [loc.pathname]);

  const pS = shelterRequests.filter((r) => r.status === 'Pending').length;
  const pR = rescueRequests.filter((r) => r.status === 'Pending').length;
  const badge = (k?: string) => (k === 'shelter' ? pS : k === 'rescue' ? pR : 0);
  const name = profile?.fullName || user?.email?.split('@')[0] || 'District Officer';

  const signOut = async () => {
    if (await confirm({ title: 'Sign out', message: 'Do you want to sign out of the District Officer portal?', confirmLabel: 'Sign out' })) { await logout(); nav('/login'); }
  };

  return (
    <div className="app">
      <div className={`drawer-bg${drawer ? ' open' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`sidebar${drawer ? ' open' : ''}`}>
        <div className="brand"><div className="brand-icon"><ShieldCheck size={22} /></div><div><b>Smart Disaster</b><small>District Officer Portal</small></div></div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, badge: b }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive || (to === '/shelters' && loc.pathname.startsWith('/shelter')) || (to === '/rescue-teams' && loc.pathname.startsWith('/rescue')) || (to === '/dashboard' && loc.pathname === '/summary') ? 'active' : '')}>
              <Icon size={19} />{label}{badge(b) > 0 && <span className="count">{badge(b)}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot"><button onClick={signOut}><LogOut size={18} />Sign out</button></div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={24} /></button>
          <h2>Smart Disaster Early-Warning System</h2>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={() => setMenu(menu === 'bell' ? null : 'bell')} aria-label="Notifications">
            <Bell size={21} />{pS + pR > 0 && <span className="badge-dot">{pS + pR > 9 ? '9+' : pS + pR}</span>}
          </button>
          <div className="vline" />
          <button className="user-btn" onClick={() => setMenu(menu === 'user' ? null : 'user')}>
            <span className="avatar">{name[0]?.toUpperCase()}</span><b className="name" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b><ChevronDown size={14} />
          </button>
          {menu === 'bell' && (
            <div className="dropdown"><h4>Notifications</h4>
              {pS + pR === 0 ? <div className="muted">You're all caught up.</div> : <>
                {pS > 0 && <button className="dd-item" onClick={() => nav('/shelter-requests')}><Building2 size={16} />{pS} pending shelter request(s)</button>}
                {pR > 0 && <button className="dd-item" onClick={() => nav('/rescue-requests')}><Users size={16} />{pR} pending rescue request(s)</button>}
              </>}
            </div>
          )}
          {menu === 'user' && (
            <div className="dropdown" style={{ width: 230 }}><h4>{name}</h4><div className="muted">{user?.email}</div>
              <button className="dd-item" onClick={() => nav('/settings')}><Settings size={16} />Settings</button>
              <button className="dd-item" style={{ color: 'var(--danger)' }} onClick={signOut}><LogOut size={16} />Sign out</button>
            </div>
          )}
        </header>
        <main className="content" onClick={() => menu && setMenu(null)}>
          <div className="content-inner">
            {permissionDenied && (
              <div className="banner"><AlertTriangle size={18} /><div>Firestore denied access to some data. Deploy the security rules (see README → "Firestore rules") and make sure this account has <code>role: "admin"</code>.</div></div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
