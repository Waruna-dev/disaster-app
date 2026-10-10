import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { Loader2, X, type LucideIcon } from 'lucide-react';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'primary';
const STATUS_TONE: Record<string, Tone> = {
  Available: 'success', Limited: 'warning', Full: 'danger', Closed: 'neutral', Pending: 'warning', Assigned: 'info', Rejected: 'danger', Completed: 'success',
  'On Mission': 'info', Unavailable: 'neutral', 'On the way': 'info', Pickup: 'purple', Active: 'danger', Expired: 'neutral', Cancelled: 'neutral',
  'In Progress': 'info', Success: 'success', Info: 'info', LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger', High: 'danger', Medium: 'warning', Low: 'success', Good: 'success',
};
export const Badge = ({ text, tone }: { text: string; tone?: Tone }) => <span className={`badge t-${tone ?? STATUS_TONE[text] ?? 'neutral'}`}>{text}</span>;

export function Card({ title, subtitle, action, children, flush, style }: { title?: string; subtitle?: string; action?: ReactNode; children?: ReactNode; flush?: boolean; style?: CSSProperties }) {
  return (
    <section className="card" style={style}>
      {(title || action) && <div className="card-head"><div className="grow"><h3>{title}</h3>{subtitle && <small>{subtitle}</small>}</div>{action}</div>}
      <div className={`card-body${flush ? ' flush' : ''}`}>{children}</div>
    </section>
  );
}

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="page-head"><div className="grow"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export function Btn({ children, icon: Icon, variant = 'primary', small, loading, onClick, disabled, type = 'button', iconOnly, title }: {
  children?: ReactNode; icon?: LucideIcon; variant?: BtnVariant; small?: boolean; loading?: boolean; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; iconOnly?: boolean; title?: string;
}) {
  return (
    <button type={type} title={title} className={`btn btn-${variant}${small ? ' btn-sm' : ''}${iconOnly ? ' btn-icon' : ''}`} disabled={disabled || loading} onClick={onClick}>
      {loading ? <Loader2 size={16} className="spin" style={{ animation: 'spin .8s linear infinite' }} /> : Icon ? <Icon size={small ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function StatCard({ icon: Icon, label, value, tone = 'primary', hint, onClick }: { icon: LucideIcon; label: string; value: ReactNode; tone?: Tone; hint?: string; onClick?: () => void }) {
  const colors: Record<Tone, [string, string]> = { primary: ['#08775F', '#E3F3EE'], info: ['#1D6FC4', '#E3F0FC'], purple: ['#7B3FA0', '#F1E7FB'], danger: ['#C62828', '#FCE8E8'], warning: ['#B7791F', '#FFF4DC'], success: ['#2E7D32', '#E6F4EA'], neutral: ['#647A76', '#EDF1F0'] };
  const [fg, bg] = colors[tone];
  const inner = (<><div className="stat-ic" style={{ background: bg, color: fg }}><Icon size={24} /></div><div><small>{label}</small><b>{value}</b>{hint && <em>{hint}</em>}</div></>);
  return onClick ? <button className="stat" onClick={onClick}>{inner}</button> : <div className="stat">{inner}</div>;
}

export interface Col<T> { key: string; title: string; render?: (r: T) => ReactNode; width?: number | string; strong?: boolean }
export function Table<T extends { id?: string }>({ cols, rows, onRow, selectedId, empty = 'No records found' }: { cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; selectedId?: string | null; empty?: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.key} style={{ width: c.width }}>{c.title}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={cols.length} className="empty">{empty}</td></tr> : rows.map((r, i) => (
            <tr key={r.id ?? i} className={`${onRow ? 'clickable' : ''}${selectedId && r.id === selectedId ? ' selected' : ''}`} onClick={() => onRow?.(r)}>
              {cols.map((c) => <td key={c.key} className={c.strong ? 'td-strong' : ''}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function usePaging<T>(rows: T[], size = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  return { page, setPage, pages, slice: rows.slice((page - 1) * size, page * size), from: rows.length ? (page - 1) * size + 1 : 0, to: Math.min(page * size, rows.length), total: rows.length };
}

export const Field = ({ label, required, hint, children }: { label?: string; required?: boolean; hint?: string; children: ReactNode }) => (
  <div className="field">{label && <label>{label}{required && <i> *</i>}</label>}{children}{hint && <div className="hint">{hint}</div>}</div>
);
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`input ${p.className ?? ''}`} />;
export const TextArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className="textarea" />;
export function Select({ value, onChange, options, placeholder, disabled }: { value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; disabled?: boolean }) {
  return (
    <select className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
export const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className={`check${checked ? ' on' : ''}`}><input type="checkbox" checked={checked} onChange={onChange} />{label}</label>
);

export const Tabs = ({ tabs, value, onChange }: { tabs: { key: string; label: string; count?: number }[]; value: string; onChange: (k: string) => void }) => (
  <div className="tabs">{tabs.map((t) => <button key={t.key} className={`tab${value === t.key ? ' on' : ''}`} onClick={() => onChange(t.key)}>{t.label}{!!t.count && <span className="n">{t.count}</span>}</button>)}</div>
);
export const KV = ({ label, children }: { label: string; children: ReactNode }) => <div className="kv"><span>{label}</span><div>{children}</div></div>;
export const Spinner = () => <div className="spinner"><i /></div>;
export const Empty = ({ icon: Icon, text }: { icon: LucideIcon; text: string }) => <div className="empty"><Icon size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>{text}</div></div>;
export const Progress = ({ pct }: { pct: number }) => <div className="bar"><i style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? '#C62828' : pct >= 85 ? '#F9A825' : '#2E7D32' }} /></div>;

export function Modal({ title, onClose, children, width = 560 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X size={22} /></button></div>
        {children}
      </div>
    </div>
  );
}
