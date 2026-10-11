import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, MailOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { deleteShelter, logActivity } from '../lib/db';
import { DISTRICTS } from '../lib/constants';
import type { Shelter } from '../lib/types';
import { Badge, Btn, Card, Empty, Input, KV, PageHeader, Progress, Select, Spinner, Table, usePaging } from '../components/ui';
import { MapView } from '../components/MapView';

export default function Shelters() {
  const { shelters, shelterRequests, loading } = useData();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [q, setQ] = useState(''); const [district, setDistrict] = useState('All Districts'); const [status, setStatus] = useState('All Status');
  const [selId, setSelId] = useState<string | null>(null);

  const filtered = useMemo(() => shelters.filter((s) =>
    (district === 'All Districts' || s.district === district) && (status === 'All Status' || s.status === status) &&
    (!q.trim() || `${s.name} ${s.location} ${s.district}`.toLowerCase().includes(q.trim().toLowerCase()))), [shelters, q, district, status]);
  const pg = usePaging(filtered, 8);
  useEffect(() => pg.setPage(1), [q, district, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel: Shelter | undefined = shelters.find((s) => s.id === selId) ?? filtered[0];
  const pending = shelterRequests.filter((r) => r.status === 'Pending').length;
  const pct = sel?.capacity ? Math.round((sel.currentOccupancy / sel.capacity) * 100) : 0;

  const remove = async (s: Shelter) => {
    if (!(await confirm({ title: 'Remove shelter', message: `Remove "${s.name}" from the system?`, confirmLabel: 'Remove', danger: true }))) return;
    await deleteShelter(s.id); await logActivity({ type: 'shelter', title: 'Shelter removed', detail: s.name, location: s.district, status: 'Info', createdBy: user?.uid }); toast('Shelter removed.');
  };
  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="View and Manage Shelters" subtitle="View and manage registered shelters, their locations, capacity and current occupancy."
        actions={<><Btn variant="secondary" icon={MailOpen} onClick={() => nav('/shelter-requests')}>Citizen Requests{pending ? ` (${pending})` : ''}</Btn><Btn icon={Plus} onClick={() => nav('/shelter-form')}>Add New Shelter</Btn></>} />
      <Card>
        <div className="filters">
          <div className="input-icon"><Search size={16} /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shelter name or location..." /></div>
          <Select value={district} onChange={setDistrict} options={['All Districts', ...DISTRICTS]} />
          <Select value={status} onChange={setStatus} options={['All Status', 'Available', 'Limited', 'Full', 'Closed']} />
          <Btn variant="secondary" onClick={() => { setQ(''); setDistrict('All Districts'); setStatus('All Status'); }}>Reset</Btn>
        </div>
      </Card>
      <div className="grid g-main">
        <Card flush>
          <Table rows={pg.slice} selectedId={sel?.id} onRow={(s) => setSelId(s.id)} empty="No shelters match your filters." cols={[
            { key: 'name', title: 'Name', strong: true }, { key: 'district', title: 'Location' }, { key: 'capacity', title: 'Capacity' }, { key: 'currentOccupancy', title: 'Occupancy' },
            { key: 'status', title: 'Status', render: (s) => <Badge text={s.status} /> },
            { key: 'a', title: 'Actions', render: (s) => (
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <Btn small variant="secondary" onClick={() => setSelId(s.id)}>View</Btn>
                <Btn small variant="secondary" iconOnly icon={Pencil} title="Edit" onClick={() => nav(`/shelter-form?id=${s.id}`)} />
                <Btn small variant="danger" iconOnly icon={Trash2} title="Remove" onClick={() => remove(s)} />
              </div>) }]} />
          <div className="pager">
            <span>Showing {pg.from} - {pg.to} of {pg.total} shelters</span>
            <span className="row-actions" style={{ alignItems: 'center' }}>
              <Btn small variant="secondary" iconOnly icon={ChevronLeft} disabled={pg.page <= 1} onClick={() => pg.setPage(pg.page - 1)} />
              <b>{pg.page} / {pg.pages}</b>
              <Btn small variant="secondary" iconOnly icon={ChevronRight} disabled={pg.page >= pg.pages} onClick={() => pg.setPage(pg.page + 1)} />
            </span>
          </div>
        </Card>
        <Card title="Selected Shelter Details">
          {!sel ? <Empty icon={Search} text="Select a shelter to see details." /> : <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><h3 style={{ fontSize: 17 }}>{sel.name}</h3><Badge text={sel.status} /></div>
            <KV label="Location">{sel.location}, {sel.district}</KV><KV label="Capacity">{sel.capacity}</KV>
            <KV label="Occupancy"><div>{sel.currentOccupancy} ({pct}%)<Progress pct={pct} /></div></KV>
            <KV label="Facilities">{sel.facilities.length ? sel.facilities.join(', ') : '—'}</KV>{sel.notes && <KV label="Notes">{sel.notes}</KV>}
            <div className="td-strong" style={{ margin: '14px 0 8px' }}>Location on Map</div>
            <MapView height={200} zoom={14} center={[sel.latitude, sel.longitude]} markers={[{ id: sel.id, lat: sel.latitude, lng: sel.longitude, label: sel.name }]} />
            <div style={{ marginTop: 14 }}><Btn variant="secondary" icon={ArrowRight} onClick={() => nav(`/shelter-form?id=${sel.id}`)}>View Full Details / Edit</Btn></div>
          </>}
        </Card>
      </div>
    </>
  );
}
