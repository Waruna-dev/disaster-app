import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check as CheckIcon, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { assignTeamToRequest, logActivity, setRescueRequestStatus, updateTeam } from '../lib/db';
import { fmtDateTime } from '../lib/format';
import type { RescueRequestStatus, RescueTeam } from '../lib/types';
import { Badge, Btn, Card, Empty, Field, KV, PageHeader, Select, Spinner, Table, Tabs, TextArea } from '../components/ui';
import { MapView } from '../components/MapView';

const NEXT: Partial<Record<RescueRequestStatus, RescueRequestStatus>> = { Assigned: 'On the way', 'On the way': 'Pickup', Pickup: 'Completed' };
const STEPS: RescueRequestStatus[] = ['Pending', 'Assigned', 'On the way', 'Pickup', 'Completed'];

export default function RescueRequests() {
  const { rescueRequests: reqs, teams, loading } = useData();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [tab, setTab] = useState('Pending'); const [selId, setSelId] = useState<string | null>(null);
  const [pick, setPick] = useState(''); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false);
  const sel = reqs.find((r) => r.id === selId) ?? null;
  useEffect(() => { setPick(''); setNotes(''); }, [selId]);

  const rows = useMemo(() => {
    if (tab === 'Active') return reqs.filter((r) => ['Assigned', 'On the way', 'Pickup'].includes(r.status));
    if (tab === 'Closed') return reqs.filter((r) => r.status === 'Completed' || r.status === 'Rejected');
    return tab === 'All' ? reqs : reqs.filter((r) => r.status === 'Pending');
  }, [reqs, tab]);
  const options = useMemo(() => {
    if (!sel) return [] as RescueTeam[];
    const score = (t: RescueTeam) => (t.type === sel.requestedType ? 0 : 2) + (t.district === sel.district ? 0 : 1);
    return teams.filter((t) => t.status === 'Available').sort((a, b) => score(a) - score(b));
  }, [sel, teams]);
  const label = (t: RescueTeam) => `${t.name} — ${t.type}, ${t.district} (${t.members} members)`;

  const assign = async () => {
    const team = options.find((t) => label(t) === pick);
    if (!sel || !team) { toast('Select a team to assign.', 'error'); return; }
    try {
      setBusy(true);
      await assignTeamToRequest(sel.id, team.id, team.name, notes.trim() || undefined);
      await updateTeam(team.id, { status: 'On Mission' });
      await logActivity({ type: 'rescue', title: 'Rescue team dispatched', detail: `${team.name} → ${sel.address}`, location: sel.district, status: 'In Progress', createdBy: user?.uid });
      toast('Team assigned. The citizen can now track progress.');
    } catch (e) { toast((e as Error).message || 'Could not assign', 'error'); } finally { setBusy(false); }
  };
  const advance = async () => {
    if (!sel) return; const next = NEXT[sel.status]; if (!next) return;
    await setRescueRequestStatus(sel.id, next);
    if (next === 'Completed') {
      if (sel.teamId) await updateTeam(sel.teamId, { status: 'Available' });
      await logActivity({ type: 'rescue', title: 'Rescue request completed', detail: `${sel.teamName} — ${sel.address}`, location: sel.district, status: 'Completed', createdBy: user?.uid });
    }
    toast(`Status updated to "${next}".`);
  };
  const reject = async () => {
    if (!sel || !(await confirm({ title: 'Reject request', message: 'Reject this rescue request?', confirmLabel: 'Reject', danger: true }))) return;
    await setRescueRequestStatus(sel.id, 'Rejected', notes.trim() || undefined); toast('Request rejected.');
  };

  if (loading) return <Spinner />;
  const n = (f: (s: string) => boolean) => reqs.filter((r) => f(r.status)).length;
  return (
    <>
      <PageHeader title="Citizen Rescue Requests" subtitle="Assign teams and track each rescue from dispatch to completion. New requests appear live." actions={<Btn variant="secondary" icon={ArrowLeft} onClick={() => nav('/rescue-teams')}>Back to Rescue Teams</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'Pending', label: 'Pending', count: n((s) => s === 'Pending') }, { key: 'Active', label: 'Active', count: n((s) => ['Assigned', 'On the way', 'Pickup'].includes(s)) }, { key: 'Closed', label: 'Completed / Rejected' }, { key: 'All', label: 'All' }]} />
      <div className="grid g-main">
        <Card flush>
          <Table rows={rows} selectedId={sel?.id} onRow={(r) => setSelId(r.id)} empty="No requests in this category." cols={[
            { key: 'userName', title: 'Citizen', strong: true, render: (r) => r.userName || 'Resident' }, { key: 'requestedType', title: 'Type' }, { key: 'peopleCount', title: 'People' },
            { key: 'status', title: 'Status', render: (r) => <Badge text={r.status} /> }, { key: 'at', title: 'Requested', render: (r) => <span className="muted">{fmtDateTime(r.createdAt)}</span> }]} />
        </Card>
        <Card title="Request details">
          {!sel ? <Empty icon={Users} text="Select a request to review." /> : <>
            <MapView height={180} zoom={13} center={[sel.latitude, sel.longitude]} markers={[{ id: 'req', lat: sel.latitude, lng: sel.longitude, label: 'Citizen location', color: '#C62828' }]} />
            <div className="steps">{STEPS.map((s, i) => <div key={s} className={`step${sel.status !== 'Rejected' && i <= STEPS.indexOf(sel.status) ? ' on' : ''}`}><i />{s}</div>)}</div>
            <KV label="Citizen">{sel.userName || 'Resident'}</KV><KV label="Contact">{sel.contactNumber}</KV><KV label="Support type">{sel.requestedType}</KV><KV label="People">{sel.peopleCount}</KV>
            <KV label="Address">{sel.address}</KV><KV label="Status"><Badge text={sel.status} /></KV>{sel.teamName && <KV label="Team">{sel.teamName}</KV>}
            {sel.status === 'Pending' && <div style={{ marginTop: 14 }}>
              <Field label="Assign team" hint="Best type / district matches are listed first."><Select value={pick} onChange={setPick} options={options.map(label)} placeholder="Select an available team" /></Field>
              <Field label="Note to citizen (optional)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Team will arrive in 20 minutes." /></Field>
              <div className="actions"><Btn icon={CheckIcon} loading={busy} onClick={assign}>Assign Team</Btn><Btn variant="danger" onClick={reject}>Reject</Btn></div>
            </div>}
            {NEXT[sel.status] && <div style={{ marginTop: 14 }}><Btn icon={ArrowRight} onClick={advance}>Mark as “{NEXT[sel.status]}”</Btn></div>}
          </>}
        </Card>
      </div>
    </>
  );
}
