import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface ConfirmOpts { title: string; message?: string; confirmLabel?: string; danger?: boolean }
interface UI { toast: (m: string, k?: Kind) => void; confirm: (o: ConfirmOpts) => Promise<boolean> }
const Ctx = createContext<UI>(null as unknown as UI);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ m: string; k: Kind } | null>(null);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((m: string, k: Kind = 'success') => {
    setToast({ m, k }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };

  return (
    <Ctx.Provider value={{ toast: show, confirm }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.k}`} role="status">
          {toast.k === 'error' ? <AlertCircle size={18} /> : toast.k === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.m}</span>
        </div>
      )}
      {dlg && (
        <div className="overlay" onClick={() => close(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{dlg.title}</h3>
            {dlg.message && <p>{dlg.message}</p>}
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${dlg.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>{dlg.confirmLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
