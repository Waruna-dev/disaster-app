import { useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { cancelWarning, createWarning, deleteWarning, logActivity } from '../lib/db';
import { RISK_COLOR, RISK_LEVELS } from '../lib/constants';
import { fmtDateTime } from '../lib/format';
import type { RiskLevel, Warning } from '../lib/types';
import { Badge, Btn, Card, Field, Input, KV, Modal, PageHeader, Select, Spinner, Table, Tabs, TextArea } from '../components/ui';
import { MapView, searchPlace } from '../components/MapView';

const EXPIRY: Record<string, number> = { '6 hours': 6, '12 hours': 12, '24 hours': 24, '48 hours': 48, '72 hours': 72 };

export default function HazardAlerts() {
  const { warnings, loading } = useData();
  const { user, profile } = useAuth();
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState('Active');
  const [sel, setSel] = useState<Warning | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: '', hazard: 'flood', risk: 'HIGH', area: '', radius: '1000', expiry: '24 hours', message: '', search: '' });
  const [pick, setPick] = useState<[number, number] | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const rows = useMemo(() => warnings.map((w) => (w.status === 'Active' && (w.expiresAt?.toMillis() ?? Infinity) < Date.now() ? { ...w, status: 'Expired' as const } : w)), [warnings]);
  const filtered = rows.filter((w) => tab === 'All' || w.status === tab);
  const current = sel ? rows.find((w) => w.id === sel.id) ?? null : null;

  const doSearch = async () => { const r = await searchPlace(f.search + ', Sri Lanka'); if (r) { setPick([r.lat, r.lng]); if (!f.area) set('area')(f.search); } else toast('Location not found', 'error'); };
  const publish = async () => {
    if (!f.title.trim() || !f.area.trim() || !f.message.trim() || !pick) { toast('Fill title, area, message and pick a map location.', 'error'); return; }
    try {
      setBusy(true);
      await createWarning({ title: f.title.trim(), hazardType: f.hazard, riskLevel: f.risk as RiskLevel, affectedArea: f.area.trim(), latitude: pick[0], longitude: pick[1], radius: parseInt(f.radius, 10), message: f.message.trim(),
        expiresAt: new Date(Date.now() + EXPIRY[f.expiry] * 3600e3), createdBy: user!.uid, createdByName: profile?.fullName ?? null });
      await logActivity({ type: 'alert', title: `Hazard alert: ${f.title.trim()}`, detail: `${f.risk} risk — ${f.area.trim()}`, location: f.area.trim(), status: 'In Progress', createdBy: user?.uid });
      toast('Hazard alert published to citizens.'); setOpen(false); setF({ title: '', hazard: 'flood', risk: 'HIGH', area: '', radius: '1000', expiry: '24 hours', message: '', search: '' }); setPick(null);
    } catch (e) { toast((e as Error).message || 'Could not publish', 'error'); } finally { setBusy(false); }
  };
  const cancel = async (w: Warning) => { if (await confirm({ title: 'Cancel alert', message: `Cancel "${w.title}"? Citizens will no longer see it as active.`, confirmLabel: 'Cancel alert', danger: true })) { await cancelWarning(w.id); toast('Alert cancelled.'); } };
  const remove = async (w: Warning) => { if (await confirm({ title: 'Delete alert', message: `Permanently delete "${w.title}"?`, confirmLabel: 'Delete', danger: true })) { await deleteWarning(w.id); setSel(null); toast('Alert deleted.'); } };

  if (loading) return <Spinner />;
  const n = (s: string) => rows.filter((w) => w.status === s).length;
  return (
    <>
      <PageHeader title="Hazard Alerts" subtitle="Publish and manage public hazard warnings for affected areas." actions={<Btn icon={Plus} onClick={() => setOpen(true)}>Create Alert</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'Active', label: 'Active', count: n('Active') }, { key: 'Expired', label: 'Expired' }, { key: 'Cancelled', label: 'Cancelled' }, { key: 'All', label: 'All' }]} />
      <div className="grid g-main">
        <Card flush>
          <Table rows={filtered} selectedId={current?.id} onRow={setSel} empty="No alerts in this category." cols={[
            { key: 'title', title: 'Alert', render: (w) => <><div className="td-strong">{w.title}</div><div className="muted">{w.affectedArea}</div></> },
            { key: 'hazardType', title: 'Type', render: (w) => (w.hazardType === 'flood' ? 'Flood' : 'Landslide') }, { key: 'risk', title: 'Risk', render: (w) => <Badge text={w.riskLevel} /> },
            { key: 'status', title: 'Status', render: (w) => <Badge text={w.status} /> }, { key: 'at', title: 'Issued', render: (w) => <span className="muted">{fmtDateTime(w.createdAt)}</span> }]} />
        </Card>
        <Card title="Alert details">
          {!current ? <div className="muted">Select an alert to see its details on the map.</div> : <>
            <MapView height={200} zoom={12} center={[current.latitude, current.longitude]} markers={[{ id: current.id, lat: current.latitude, lng: current.longitude, label: current.title, color: RISK_COLOR[current.riskLevel] }]}
              circles={[{ lat: current.latitude, lng: current.longitude, radius: current.radius, color: RISK_COLOR[current.riskLevel] }]} />
            <div style={{ marginTop: 12 }}>
              <KV label="Title">{current.title}</KV><KV label="Risk"><Badge text={current.riskLevel} /></KV><KV label="Area">{current.affectedArea}</KV>
              <KV label="Radius">{current.radius} m</KV><KV label="Expires">{fmtDateTime(current.expiresAt)}</KV><KV label="Message">{current.message}</KV>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              {current.status === 'Active' && <Btn small variant="danger" onClick={() => cancel(current)}>Cancel alert</Btn>}
              <Btn small variant="secondary" icon={Trash2} onClick={() => remove(current)}>Delete</Btn>
            </div>
          </>}
        </Card>
      </div>

      {open && (
        <Modal title="Create Hazard Alert" onClose={() => setOpen(false)} width={860}>
          <div className="grid g-2">
            <div>
              <Field label="Alert title" required><Input value={f.title} onChange={(e) => set('title')(e.target.value)} placeholder="e.g., Flood Warning" /></Field>
              <div className="cols">
                <Field label="Hazard type" required><Select value={f.hazard} onChange={set('hazard')} options={['flood', 'landslide']} /></Field>
                <Field label="Risk level" required><Select value={f.risk} onChange={set('risk')} options={RISK_LEVELS} /></Field>
              </div>
              <Field label="Affected area" required><Input value={f.area} onChange={(e) => set('area')(e.target.value)} placeholder="e.g., Kandy, Central Province" /></Field>
              <div className="cols">
                <Field label="Radius (m)"><Select value={f.radius} onChange={set('radius')} options={['300', '500', '1000', '2000', '3000']} /></Field>
                <Field label="Expires in"><Select value={f.expiry} onChange={set('expiry')} options={Object.keys(EXPIRY)} /></Field>
              </div>
              <Field label="Public message" required><TextArea value={f.message} onChange={(e) => set('message')(e.target.value)} placeholder="Instructions shown to citizens…" /></Field>
            </div>
            <div>
              <Field label="Location on map" required hint="Search (press Enter) or click the map to drop the alert centre.">
                <Input value={f.search} onChange={(e) => set('search')(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Search for a location…" />
              </Field>
              <MapView height={300} pickable pick={pick} onPick={(a, b) => setPick([a, b])} circles={pick ? [{ lat: pick[0], lng: pick[1], radius: parseInt(f.radius, 10), color: RISK_COLOR[f.risk] }] : []} />
              <div className="muted" style={{ marginTop: 6 }}>{pick ? `Selected: ${pick[0].toFixed(4)}, ${pick[1].toFixed(4)}` : 'No location selected'}</div>
            </div>
          </div>
          <div className="modal-foot"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn icon={Megaphone} loading={busy} onClick={publish}>Publish Alert</Btn></div>
        </Modal>
      )}
    </>
  );
}
