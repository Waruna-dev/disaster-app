import type { Timestamp } from 'firebase/firestore';
export const fmtDate = (t?: Timestamp | null) => (t?.toDate ? t.toDate().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (t?: Timestamp | null) =>
  t?.toDate ? `${t.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${t.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—';
export const ms = (t?: Timestamp | null) => (t?.toMillis ? t.toMillis() : 0);
export const num = (n: number) => n.toLocaleString();
export const todayISO = () => new Date().toISOString().slice(0, 10);
