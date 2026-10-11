import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { UIProvider } from './context/UIContext';
import { firebaseConfigured } from './lib/firebase';
import Layout from './components/Layout';
import { Btn, Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HazardAlerts from './pages/HazardAlerts';
import Shelters from './pages/Shelters';
import ShelterForm from './pages/ShelterForm';
import ShelterRequests from './pages/ShelterRequests';
import RescueTeams from './pages/RescueTeams';
import RescueRequests from './pages/RescueRequests';
import Resources from './pages/Resources';
import Reports from './pages/Reports';
import Summary from './pages/Summary';
import Settings from './pages/Settings';

function Guard() {
  const { user, profile, loading, isOfficer, logout } = useAuth();
  if (loading) return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isOfficer)
    return (
      <div className="denied"><div>
        <ShieldAlert size={40} color="#C62828" /><h2>Access restricted</h2>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
          This portal is for District Officers only. {profile ? 'Your account does not have the "admin" role.' : 'No user profile was found for this account.'}
        </p>
        <Btn variant="secondary" onClick={logout}>Sign out</Btn>
      </div></div>
    );
  return <DataProvider><Layout /></DataProvider>;
}

export default function App() {
  if (!firebaseConfigured)
    return (
      <div className="denied"><div>
        <ShieldAlert size={40} color="#B7791F" /><h2>Firebase is not configured</h2>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          Create <code>officer-web/.env</code> from <code>.env.example</code>, or keep <code>frontend/.env</code> in place (it is read automatically). Then restart <code>npm run dev</code>.
        </p>
      </div></div>
    );
  return (
    <AuthProvider><UIProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hazard-alerts" element={<HazardAlerts />} />
          <Route path="/shelters" element={<Shelters />} />
          <Route path="/shelter-form" element={<ShelterForm />} />
          <Route path="/shelter-requests" element={<ShelterRequests />} />
          <Route path="/rescue-teams" element={<RescueTeams />} />
          <Route path="/rescue-requests" element={<RescueRequests />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </UIProvider></AuthProvider>
  );
}
