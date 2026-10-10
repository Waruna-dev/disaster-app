import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, BarChart3, Lock, Mail, Package, ShieldCheck, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Btn, Field } from '../components/ui';

export default function Login() {
  const { user, isOfficer, login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!loading && user && isOfficer) nav('/dashboard', { replace: true }); }, [loading, user, isOfficer, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    try {
      setBusy(true);
      await login(email.trim(), password);
      const uid = auth.currentUser!.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists() || snap.data().role !== 'admin') { await signOut(auth); setError('This account is not authorised for the District Officer portal.'); return; }
      nav('/dashboard', { replace: true });
    } catch { setError('Invalid email or password.'); } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <div className="login-hero">
        <div className="big-ic"><ShieldCheck size={42} /></div>
        <h1>Smart Disaster<br />Early-Warning System</h1>
        <p>Coordinate shelters, rescue teams and relief resources for effective disaster response across Sri Lanka.</p>
        <ul>
          <li><Building2 size={18} />Shelter management &amp; occupancy</li><li><Users size={18} />Rescue team dispatch</li>
          <li><Package size={18} />Relief resource tracking</li><li><BarChart3 size={18} />Live reports &amp; PDF export</li>
        </ul>
      </div>
      <div className="login-form">
        <form onSubmit={submit}>
          <h2>District Officer Sign in</h2><p className="sub">Use your officer account to access the portal.</p>
          <Field label="Email"><div className="input-icon"><Mail size={16} /><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@example.com" /></div></Field>
          <Field label="Password"><div className="input-icon"><Lock size={16} /><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div></Field>
          {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
          <Btn type="submit" loading={busy}>Sign in</Btn>
          <p className="muted" style={{ textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>Citizens should use the mobile app. This portal is for authorised officers only.</p>
        </form>
      </div>
    </div>
  );
}
