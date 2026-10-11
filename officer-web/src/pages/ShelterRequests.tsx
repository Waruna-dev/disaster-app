import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check as CheckIcon, CheckCheck, MailOpen } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { assignShelter, logActivity, setShelterRequestStatus } from '../lib/db';
import { fmtDateTime } from '../lib/format';
import type { Shelter } from '../lib/types';
import { Badge, Btn, Card, Empty, Field, KV, PageHeader, Select, Spinner, Table, Tabs, TextArea } from '../components/ui';
import { MapView } from '../components/MapView';

export default function ShelterRequests() {
  const { shelterRequests: reqs, shelters, loading } = useData();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [tab, setTab] = useState('Pending');
  const [selId, setSelId] = useState<string | null>(null);
  const [pick, setPick] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const sel = reqs.find((r) => r.id === selId) ?? null;
  useEffect(() => { setPick(''); setNotes(''); }, [selId]);

  const rows = useMemo(() => (tab === 'All' ? reqs : reqs.filter((r) => r.status === tab)), [reqs, tab]);
  const options = useMemo(() => {
    if (!sel?.district) return [] as Shelter[];
    const district = sel.district.trim().toLocaleLowerCase();
    return shelters
      .filter((s) => (s.status === 'Available' || s.status === 'Limited') && s.district.trim().toLocaleLowerCase() === district);
  }, [sel, shelters]);
  const label = (s: Shelter) => `${s.name} — ${s.district} (${s.capacity - s.currentOccupancy} free)`;

  const assign = async () => {
    const shelter = options.find((s) => label(s) === pick);
    if (!sel || !shelter) { toast('Select a shelter to assign.', 'error'); return; }
    try {
      setBusy(true);
      await assignShelter(sel.id, shelter.id, shelter.name, sel.peopleCount, notes.trim() || undefined);
      await logActivity({ type: 'shelter', title: 'Shelter assigned to request', detail: `${sel.userName || 'Resident'} (${sel.peopleCount} people) → ${shelter.name}`, location: shelter.district, status: 'Success', createdBy: user?.uid });
      toast('Shelter assigned. The citizen can see the update.');
    } catch (e) { toast((e as Error).message || 'Could not assign', 'error'); } finally { setBusy(false); }
  };
  const reject = async () => {
    if (!sel || !(await confirm({ title: 'Reject request', message: 'Reject this shelter request? The citizen will see it as Rejected.', confirmLabel: 'Reject', danger: true }))) return;
    await setShelterRequestStatus(sel.id, 'Rejected', notes.trim() || undefined);
    await logActivity({ type: 'shelter', title: 'Shelter request rejected', detail: sel.userName || 'Resident', location: sel.district, status: 'Info', createdBy: user?.uid }); toast('Request rejected.');
  };

  if (loading) return <Spinner />;
  const n = (s: string) => reqs.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader title="Citizen Shelter Requests" subtitle="Review requests from citizens and assign a suitable shelter. New requests appear live." actions={<Btn variant="secondary" icon={ArrowLeft} onClick={() => nav('/shelters')}>Back to Shelters</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'Pending', label: 'Pending', count: n('Pending') }, { key: 'Assigned', label: 'Assigned' }, { key: 'Rejected', label: 'Rejected' }, { key: 'All', label: 'All' }]} />
      <div className="grid g-main">
        <Card flush>
          <Table rows={rows} selectedId={sel?.id} onRow={(r) => setSelId(r.id)} empty="No requests in this category." cols={[
            { key: 'userName', title: 'Citizen', strong: true, render: (r) => r.userName || 'Resident' }, { key: 'address', title: 'Location', render: (r) => <span style={{ display: 'block', maxWidth: 260 }}>{r.address}</span> },
            { key: 'peopleCount', title: 'People' }, { key: 'status', title: 'Status', render: (r) => <Badge text={r.status} /> }, { key: 'at', title: 'Requested', render: (r) => <span className="muted">{fmtDateTime(r.createdAt)}</span> }]} />
        </Card>
        <Card title="Request details">
          {!sel ? <Empty icon={MailOpen} text="Select a request to review." /> : <>
            <MapView height={180} zoom={13} center={[sel.latitude, sel.longitude]} markers={[{ id: 'req', lat: sel.latitude, lng: sel.longitude, label: 'Citizen location', color: '#C62828' }, ...options.slice(0, 5).map((o) => ({ id: o.id, lat: o.latitude, lng: o.longitude, label: o.name }))]} />
            <div style={{ marginTop: 10 }}>
              <KV label="Citizen">{sel.userName || 'Resident'}</KV>{sel.contactNumber && <KV label="Contact">{sel.contactNumber}</KV>}<KV label="People">{sel.peopleCount}</KV>
              <KV label="Address">{sel.address}</KV><KV label="Situation">{sel.description}</KV><KV label="Status"><Badge text={sel.status} /></KV><KV label="Citizen selected shelter">{sel.shelterName || 'No shelter selected'}</KV>
            </div>
            {sel.status === 'Pending' && <div style={{ marginTop: 14 }}>
              <Field label="Assign shelter" hint={sel.district ? `Shelters in ${sel.district} are shown.` : 'The citizen district is unavailable, so no shelters can be assigned.'}><Select value={pick} onChange={setPick} options={options.map(label)} placeholder="Select a shelter" disabled={!sel.district || options.length === 0} /></Field>
              <Field label="Note to citizen (optional)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Bring ID and essential medicines." /></Field>
              <div className="actions"><Btn icon={CheckIcon} loading={busy} onClick={assign}>Assign Shelter</Btn><Btn variant="danger" onClick={reject}>Reject</Btn></div>
            </div>}
            {sel.status === 'Assigned' && <div style={{ marginTop: 14 }}><Btn variant="success" icon={CheckCheck} onClick={async () => { await setShelterRequestStatus(sel.id, 'Completed'); toast('Marked as completed.'); }}>Mark as Completed</Btn></div>}
          </>}
        </Card>
      </div>
    </>
  );
}
