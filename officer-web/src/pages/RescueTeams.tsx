import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check as CheckIcon, MailOpen, Pencil, Plus, Save, Search, Trash2, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { completeAssignment, createAssignment, createTeam, deleteTeam, logActivity, updateTeam } from '../lib/db';
import { DISTRICTS, DISTRICT_COORDS, TEAM_TYPES } from '../lib/constants';
import { fmtDateTime } from '../lib/format';
import type { RescueAssignment, RescueTeam, RescueTeamStatus, RescueTeamType } from '../lib/types';
import { Badge, Btn, Card, Empty, Field, Input, KV, Modal, PageHeader, Select, Spinner, Table, TextArea } from '../components/ui';
import { MapView, searchPlace } from '../components/MapView';

const COLOR: Record<string, string> = { Available: '#2E7D32', 'On Mission': '#1D6FC4', Unavailable: '#8A9C99' };

export default function RescueTeams() {
  const { teams, assignments, rescueRequests, warnings, loading } = useData();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [q, setQ] = useState(''); const [district, setDistrict] = useState('All Districts'); const [status, setStatus] = useState('All Status');
  const [selId, setSelId] = useState<string | null>(null);
  const [area, setArea] = useState(''); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ edit: RescueTeam | null } | null>(null);
  const [t, setT] = useState({ name: '', type: '', district: '', members: '', equipment: '', status: 'Available', search: '' });
  const [pick, setPick] = useState<[number, number] | null>(null);
  const setTf = (k: keyof typeof t) => (v: string) => setT((s) => ({ ...s, [k]: v }));

  const filtered = useMemo(() => teams.filter((x) => (district === 'All Districts' || x.district === district) && (status === 'All Status' || x.status === status) &&
    (!q.trim() || `${x.name} ${x.type} ${x.district}`.toLowerCase().includes(q.trim().toLowerCase()))), [teams, q, district, status]);
  const sel = teams.find((x) => x.id === selId) ?? filtered[0];
  const pending = rescueRequests.filter((r) => r.status === 'Pending').length;
  const active = assignments.filter((a) => a.status === 'In Progress');
  const areas = useMemo(() => Array.from(new Set([...warnings.filter((w) => w.status === 'Active').map((w) => w.affectedArea), ...DISTRICTS.map((d) => `${d} - Flood Affected Area`)])), [warnings]);

  const assign = async () => {
    if (!sel || !area) { toast('Select a team and an affected area.', 'error'); return; }
    if (sel.status !== 'Available') { toast('Only available teams can be assigned.', 'error'); return; }
    try {
      setBusy(true);
      await createAssignment({ teamId: sel.id, teamName: sel.name, area, notes: notes.trim() || undefined, createdBy: user?.uid });
      await updateTeam(sel.id, { status: 'On Mission' });
      await logActivity({ type: 'rescue', title: 'Rescue team assigned', detail: `${sel.name} → ${area}`, location: area, status: 'In Progress', createdBy: user?.uid });
      toast(`${sel.name} assigned to ${area}.`); setArea(''); setNotes('');
    } catch (e) { toast((e as Error).message || 'Assignment failed', 'error'); } finally { setBusy(false); }
  };
  const finish = async (a: RescueAssignment) => {
    await completeAssignment(a.id); await updateTeam(a.teamId, { status: 'Available' });
    await logActivity({ type: 'rescue', title: 'Rescue mission completed', detail: `${a.teamName} — ${a.area}`, location: a.area, status: 'Completed', createdBy: user?.uid }); toast('Mission completed. Team is available again.');
  };

  const openForm = (e: RescueTeam | null) => {
    setForm({ edit: e }); setPick(e ? [e.latitude, e.longitude] : null);
    setT({ name: e?.name ?? '', type: e?.type ?? '', district: e?.district ?? '', members: e ? String(e.members) : '', equipment: e?.equipment ?? '', status: e?.status ?? 'Available', search: '' });
  };
  const saveTeam = async () => {
    const m = parseInt(t.members, 10);
    if (!t.name.trim() || !t.type || !t.district || !m) { toast('Fill team name, type, district and members.', 'error'); return; }
    if (!pick) { toast("Pin the team's base location on the map.", 'error'); return; }
    try {
      setBusy(true);
      const p = { name: t.name.trim(), type: t.type as RescueTeamType, district: t.district, members: m, equipment: t.equipment.trim() || null, status: t.status as RescueTeamStatus, latitude: pick[0], longitude: pick[1], currentLocationLabel: t.district };
      if (form?.edit) await updateTeam(form.edit.id, p); else await createTeam(p);
      await logActivity({ type: 'rescue', title: form?.edit ? 'Rescue team updated' : 'Rescue team registered', detail: p.name, location: t.district, status: 'Success', createdBy: user?.uid });
      toast('Team saved.'); setForm(null);
    } catch (e) { toast((e as Error).message || 'Save failed', 'error'); } finally { setBusy(false); }
  };
  const remove = async (x: RescueTeam) => { if (await confirm({ title: 'Remove team', message: `Remove "${x.name}"?`, confirmLabel: 'Remove', danger: true })) { await deleteTeam(x.id); toast('Team removed.'); } };
  const search = async () => { const r = await searchPlace(t.search + ', Sri Lanka'); if (r) setPick([r.lat, r.lng]); else toast('Location not found', 'error'); };

  if (loading) return <Spinner />;
  return (
    <>
      <PageHeader title="Assign Rescue Team" subtitle="View available rescue teams and assign a team to the selected affected area."
        actions={<><Btn variant="secondary" icon={MailOpen} onClick={() => nav('/rescue-requests')}>Citizen Requests{pending ? ` (${pending})` : ''}</Btn><Btn icon={Plus} onClick={() => openForm(null)}>Add Rescue Team</Btn></>} />
      <div className="grid g-main">
        <div>
          <Card title="Available Rescue Teams">
            <div className="filters" style={{ marginBottom: 14, gridTemplateColumns: '2fr 1fr 1fr' }}>
              <div className="input-icon"><Search size={16} /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team name or type..." /></div>
              <Select value={district} onChange={setDistrict} options={['All Districts', ...DISTRICTS]} />
              <Select value={status} onChange={setStatus} options={['All Status', 'Available', 'On Mission', 'Unavailable']} />
            </div>
            <Table rows={filtered} selectedId={sel?.id} onRow={(x) => setSelId(x.id)} empty="No rescue teams found." cols={[
              { key: 'name', title: 'Team Name', strong: true }, { key: 'type', title: 'Type' }, { key: 'district', title: 'District' },
              { key: 'status', title: 'Current Status', render: (x) => <Badge text={x.status} /> },
              { key: 'a', title: 'Actions', render: (x) => (
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <Btn small variant={x.status === 'Available' ? 'primary' : 'secondary'} onClick={() => setSelId(x.id)}>{x.status === 'Available' ? 'Assign' : 'View'}</Btn>
                  <Btn small variant="secondary" iconOnly icon={Pencil} title="Edit" onClick={() => openForm(x)} /><Btn small variant="danger" iconOnly icon={Trash2} title="Remove" onClick={() => remove(x)} />
                </div>) }]} />
          </Card>
          <Card title="Assignment Details">
            {!sel ? <div className="muted">Select an available team above.</div> : <>
              <p style={{ marginBottom: 14 }}>Assigning: <b>{sel.name}</b> <Badge text={sel.status} /></p>
              <div className="cols">
                <Field label="Select Affected Area" required><Select value={area} onChange={setArea} options={areas} placeholder="Select affected area" /></Field>
                <Field label="Assignment Notes (Optional)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter any additional notes..." /></Field>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={() => { setArea(''); setNotes(''); }}>Cancel</Btn><Btn icon={CheckIcon} loading={busy} disabled={sel.status !== 'Available'} onClick={assign}>Confirm Assignment</Btn>
              </div>
            </>}
          </Card>
          <Card title="Active Missions">
            <Table rows={active} empty="No active missions." cols={[{ key: 'teamName', title: 'Team', strong: true }, { key: 'area', title: 'Area' }, { key: 'at', title: 'Since', render: (a) => <span className="muted">{fmtDateTime(a.createdAt)}</span> },
              { key: 'x', title: '', render: (a) => <Btn small variant="success" onClick={() => finish(a)}>Complete</Btn> }]} />
          </Card>
        </div>
        <div>
          <Card title="Selected Team Information">
            {!sel ? <Empty icon={Users} text="No team selected." /> : <><KV label="Team Name">{sel.name}</KV><KV label="Type">{sel.type}</KV><KV label="District">{sel.district}</KV><KV label="Members">{sel.members}</KV><KV label="Equipment">{sel.equipment || '—'}</KV><KV label="Status"><Badge text={sel.status} /></KV></>}
          </Card>
          <Card title="Team Current Location">
            <MapView height={250} zoom={11} center={sel ? [sel.latitude, sel.longitude] : undefined} selectedId={sel?.id} onMarkerClick={(id) => setSelId(id)}
              markers={teams.map((x) => ({ id: x.id, lat: x.latitude, lng: x.longitude, label: x.name, sub: x.status, color: COLOR[x.status] }))} />
          </Card>
        </div>
      </div>

      {form && (
        <Modal title={form.edit ? 'Edit Rescue Team' : 'Add Rescue Team'} onClose={() => setForm(null)} width={860}>
          <div className="grid g-2">
            <div>
              <Field label="Team Name" required><Input value={t.name} onChange={(e) => setTf('name')(e.target.value)} placeholder="e.g., Kandy Rescue Team" /></Field>
              <div className="cols">
                <Field label="Type" required><Select value={t.type} onChange={setTf('type')} options={TEAM_TYPES} placeholder="Select type" /></Field>
                <Field label="District" required><Select value={t.district} onChange={(v) => { setTf('district')(v); if (!pick) setPick(DISTRICT_COORDS[v]); }} options={DISTRICTS} placeholder="Select district" /></Field>
              </div>
              <div className="cols">
                <Field label="Members" required><Input type="number" min={1} value={t.members} onChange={(e) => setTf('members')(e.target.value)} placeholder="e.g., 12" /></Field>
                <Field label="Status"><Select value={t.status} onChange={setTf('status')} options={['Available', 'On Mission', 'Unavailable']} /></Field>
              </div>
              <Field label="Equipment"><Input value={t.equipment} onChange={(e) => setTf('equipment')(e.target.value)} placeholder="e.g., 2 Vehicles, Medical Kit" /></Field>
            </div>
            <div>
              <Field label="Base location" required hint="Search (Enter) or click the map to pin the team's base."><Input value={t.search} onChange={(e) => setTf('search')(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search for a location…" /></Field>
              <MapView height={270} pickable pick={pick} onPick={(a, b) => setPick([a, b])} />
            </div>
          </div>
          <div className="modal-foot"><Btn variant="secondary" onClick={() => setForm(null)}>Cancel</Btn><Btn icon={Save} loading={busy} onClick={saveTeam}>Save Team</Btn></div>
        </Modal>
      )}
    </>
  );
}
