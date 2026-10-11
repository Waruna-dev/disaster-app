import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../lib/types';

interface AuthState {
  user: User | null; profile: UserProfile | null; loading: boolean; isOfficer: boolean;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; changePassword: (pw: string) => Promise<void>;
}
const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      try { const s = await getDoc(doc(db, 'users', u.uid)); setProfile(s.exists() ? ({ id: s.id, ...s.data() } as UserProfile) : null); }
      catch { setProfile(null); }
    } else setProfile(null);
    setLoading(false);
  }), []);

  const value: AuthState = {
    user, profile, loading, isOfficer: profile?.role === 'admin',
    login: async (e, p) => { await signInWithEmailAndPassword(auth, e, p); },
    logout: () => signOut(auth),
    changePassword: async (pw) => { if (!auth.currentUser) throw new Error('Not signed in'); await updatePassword(auth.currentUser, pw); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
