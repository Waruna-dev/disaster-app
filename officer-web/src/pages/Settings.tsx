import { useState } from 'react';
import { CloudUpload, KeyRound, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { seedDemoData } from '../lib/db';
import { Badge, Btn, Card, Field, Input, KV, PageHeader } from '../components/ui';

export default function Settings() {
  const { user, profile, logout, changePassword } = useAuth();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [busy, setBusy] = useState(false); const [seeding, setSeeding] = useState(false);

  const change = async () => {
    if (pw.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    if (pw !== pw2) { toast('Passwords do not match.', 'error'); return; }
    try { setBusy(true); await changePassword(pw); setPw(''); setPw2(''); toast('Password updated.'); }
    catch (e) { toast((e as { code?: string }).code === 'auth/requires-recent-login' ? 'Please sign out and sign in again, then retry.' : (e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const seed = async () => {
    if (!(await confirm({ title: 'Load demo data', message: 'This adds 6 shelters, 5 rescue teams, 5 resources and 3 hazard alerts to your database. Use it only on a test project.', confirmLabel: 'Load demo data' }))) return;
    try { setSeeding(true); const n = await seedDemoData(user!.uid); toast(`Added ${n} demo records.`); } catch (e) { toast((e as Error).message || 'Could not load demo data', 'error'); } finally { setSeeding(false); }
  };
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your officer account and portal data." />
      <div className="grid g-2">
        <div>
          <Card title="Profile">
            <KV label="Name">{profile?.fullName || '—'}</KV><KV label="Email">{user?.email || '—'}</KV><KV label="Contact">{profile?.contactNumber || '—'}</KV><KV label="Role"><Badge text="District Officer" tone="primary" /></KV>
            <div style={{ marginTop: 16 }}><Btn variant="secondary" icon={LogOut} onClick={async () => { await logout(); nav('/login'); }}>Sign out</Btn></div>
          </Card>
          <Card title="Change Password">
            <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></Field>
            <Field label="Confirm password"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Re-enter password" /></Field>
            <Btn icon={KeyRound} loading={busy} onClick={change}>Update Password</Btn>
          </Card>
        </div>
        <div>
          <Card title="Demo Data" subtitle="Quickly fill an empty database for testing and presentations.">
            <p style={{ lineHeight: 1.6, color: 'var(--text-mid)', marginBottom: 16 }}>Creates sample Sri Lankan shelters, rescue teams, relief resources and hazard alerts so every screen has content.</p>
            <Btn icon={CloudUpload} loading={seeding} onClick={seed}>Load Demo Data</Btn>
          </Card>
          <Card title="About"><p style={{ lineHeight: 1.6, color: 'var(--text-mid)' }}>Smart Disaster Early-Warning System — District Officer Portal (web). Citizens use the mobile app; both share the same Firebase project.</p></Card>
        </div>
      </div>
    </>
  );
}
