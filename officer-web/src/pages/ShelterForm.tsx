import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { createShelter, deriveShelterStatus, logActivity, updateShelter } from '../lib/db';
import { DISTRICTS, DISTRICT_COORDS, SHELTER_FACILITIES } from '../lib/constants';
import { Badge, Btn, Card, Check, Field, Input, KV, PageHeader, Select, TextArea } from '../components/ui';
import { MapView, reversePlace, searchPlace } from '../components/MapView';

export default function ShelterForm() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { shelters } = useData();
  const { user } = useAuth();
  const { toast } = useUI();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', district: '', location: '', capacity: '', occupancy: '0', notes: '', search: '' });
  const [facilities, setFacilities] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!id || loaded) return;
    const s = shelters.find((x) => x.id === id);
    if (s) {
      setF({ name: s.name, district: s.district, location: s.location, capacity: String(s.capacity), occupancy: String(s.currentOccupancy), notes: s.notes ?? '', search: '' });
      setFacilities(s.facilities); setClosed(s.status === 'Closed'); setPick([s.latitude, s.longitude]); setLoaded(true);
    }
  }, [id, shelters, loaded]);

  const cap = parseInt(f.capacity, 10) || 0, occ = parseInt(f.occupancy, 10) || 0;
  const status = deriveShelterStatus(cap, occ, closed);
  const toggle = (x: string) => setFacilities((p) => (p.includes(x) ? p.filter((y) => y !== x) : [...p, x]));

  const onDistrict = (d: string) => { set('district')(d); if (!pick && DISTRICT_COORDS[d]) setPick(DISTRICT_COORDS[d]); };
  const onPick = async (lat: number, lng: number) => { setPick([lat, lng]); if (!f.location.trim()) { const a = await reversePlace(lat, lng); if (a) set('location')(a); } };
  const doSearch = async () => { const r = await searchPlace(f.search); if (r) { setPick([r.lat, r.lng]); if (!f.location.trim()) set('location')(r.name); } else toast('Location not found', 'error'); };

  const save = async () => {
    if (!f.name.trim() || !f.district || !f.location.trim() || !cap) { toast('Please fill shelter name, district, address and capacity.', 'error'); return; }
    if (occ > cap) { toast('Occupancy cannot exceed capacity.', 'error'); return; }
    if (!pick) { toast('Please select the shelter location on the map.', 'error'); return; }
    try {
      setBusy(true);
      const payload = { name: f.name.trim(), district: f.district, location: f.location.trim(), latitude: pick[0], longitude: pick[1], capacity: cap, currentOccupancy: occ, facilities, status, notes: f.notes.trim() || null };
      if (id) await updateShelter(id, payload); else await createShelter(payload);
      await logActivity({ type: 'shelter', title: id ? 'Shelter updated' : 'Shelter registered', detail: `${payload.name} — capacity ${cap}, occupancy ${occ}`, location: f.district, status: 'Success', createdBy: user?.uid });
      toast(id ? 'Shelter updated.' : 'Shelter registered.'); nav('/shelters');
    } catch (e) { toast((e as Error).message || 'Save failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={id ? 'Edit Shelter Details' : 'Register / Edit Shelter Details'} subtitle="Enter shelter details to register a new emergency shelter in the system." />
      <div className="grid g-form">
        <Card title="Shelter Information">
          <div className="cols">
            <Field label="Shelter Name" required><Input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Enter shelter name" /></Field>
            <Field label="District" required><Select value={f.district} onChange={onDistrict} options={DISTRICTS} placeholder="Select district" /></Field>
          </div>
          <Field label="Location / Address" required><TextArea value={f.location} onChange={(e) => set('location')(e.target.value)} placeholder="Enter full address or location details" /></Field>
          <div className="cols">
            <Field label="Capacity" required><Input type="number" min={0} value={f.capacity} onChange={(e) => set('capacity')(e.target.value)} placeholder="e.g., 500" /></Field>
            <Field label="Current Occupancy"><Input type="number" min={0} value={f.occupancy} onChange={(e) => set('occupancy')(e.target.value)} placeholder="e.g., 0" /></Field>
          </div>
          <Field label="Facilities"><div className="chips">{SHELTER_FACILITIES.map((x) => <Check key={x} label={x} checked={facilities.includes(x)} onChange={() => toggle(x)} />)}</div></Field>
          <Field label="Availability"><Check label="Mark shelter as closed" checked={closed} onChange={() => setClosed(!closed)} /></Field>
          <Field label="Additional Notes"><TextArea value={f.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Enter any additional information (optional)" /></Field>
        </Card>
        <div>
          <Card title="Select Location on Map">
            <Field><Input value={f.search} onChange={(e) => set('search')(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Search for a location… (press Enter)" /></Field>
            <MapView height={260} pickable pick={pick} onPick={onPick} />
            <div className="muted" style={{ marginTop: 8 }}>{pick ? `Pinned: ${pick[0].toFixed(4)}, ${pick[1].toFixed(4)}` : 'Click the map to place the shelter pin.'}</div>
          </Card>
          <Card title="Preview Details">
            <KV label="Shelter Name">{f.name || '-'}</KV><KV label="District">{f.district || '-'}</KV><KV label="Location">{f.location || '-'}</KV><KV label="Capacity">{cap || '-'}</KV>
            <KV label="Facilities">{facilities.length ? facilities.join(', ') : '-'}</KV><KV label="Status">{cap ? <Badge text={status} /> : '-'}</KV>
          </Card>
        </div>
      </div>
      <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 30 }}>
        <Btn variant="secondary" onClick={() => nav('/shelters')}>Cancel</Btn><Btn icon={Save} loading={busy} onClick={save}>{id ? 'Save Changes' : 'Save Shelter'}</Btn>
      </div>
    </>
  );
}
