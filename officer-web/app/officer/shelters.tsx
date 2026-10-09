import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Shelter } from '../../types/shelter';
import { fetchAllShelters, deleteShelter } from '../../services/shelterService';
import { fetchAllShelterRequests, syncShelterOccupanciesFromAssignedRequests } from '../../services/shelterRequestService';
import { logActivity } from '../../services/activityService';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { Badge, Btn, Card, Col, EmptyState, Input, KV, PageHeader, Row, Select, Spinner, Table, useUI } from '../../components/officer/ui';
import { WebMap } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

const PAGE = 8;

export default function SheltersPage() {
  const { toast, confirm } = useUI();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState<string>('All Districts');
  const [status, setStatus] = useState<string>('All Status');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Shelter | null>(null);

  const load = useCallback(async () => {
    await syncShelterOccupanciesFromAssignedRequests();
    const [s, r] = await Promise.all([fetchAllShelters(), fetchAllShelterRequests().catch(() => [])]);
    setShelters(s);
    setPending(r.filter((x) => x.status === 'Pending').length);
    setSel((cur) => (cur ? s.find((x) => x.id === cur.id) ?? null : s[0] ?? null));
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => shelters.filter((s) =>
    (district === 'All Districts' || s.district === district) &&
    (status === 'All Status' || s.status === status) &&
    (!q.trim() || `${s.name} ${s.location} ${s.district}`.toLowerCase().includes(q.trim().toLowerCase()))
  ), [shelters, q, district, status]);
  useEffect(() => setPage(1), [q, district, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice((page - 1) * PAGE, page * PAGE);

  const remove = async (s: Shelter) => {
    if (!(await confirm({ title: 'Remove shelter', message: `Remove "${s.name}" from the system?`, confirmLabel: 'Remove', danger: true }))) return;
    await deleteShelter(s.id);
    await logActivity({ type: 'shelter', title: 'Shelter removed', detail: s.name, location: s.district, status: 'Info' });
    toast('Shelter removed.'); load();
  };

  if (loading) return <Spinner />;
  const pct = sel && sel.capacity ? Math.min(100, Math.round((sel.currentOccupancy / sel.capacity) * 100)) : 0;

  return (
    <View>
      <PageHeader title="View and Manage Shelters" subtitle="View and manage registered shelters, their locations, capacity and current occupancy."
        actions={<>
          <Btn label={`Citizen Requests${pending ? ` (${pending})` : ''}`} icon="mail-unread-outline" variant="secondary" onPress={() => router.push('/officer/shelter-requests' as any)} />
          <Btn label="Add New Shelter" icon="add" onPress={() => router.push('/officer/shelter-form' as any)} />
        </>} />

      <Card>
        <Row breakAt="mobile" gap={12}>
          <Col flex={2}><Input icon="search" value={q} onChangeText={setQ} placeholder="Search shelter name or location..." /></Col>
          <Col><Select value={district} options={['All Districts', ...SRI_LANKA_DISTRICTS]} onChange={setDistrict} /></Col>
          <Col><Select value={status} options={['All Status', 'Available', 'Limited', 'Full', 'Closed']} onChange={setStatus} /></Col>
          <Btn label="Reset" variant="secondary" onPress={() => { setQ(''); setDistrict('All Districts'); setStatus('All Status'); }} />
        </Row>
      </Card>

      <Row>
        <Col flex={1.7}>
          <Card padded={false}>
            <View style={{ padding: 12 }}>
              <Table rows={view} selectedId={sel?.id} onRowPress={setSel} minWidth={640} empty="No shelters match your filters."
                columns={[
                  { key: 'name', title: 'Name', flex: 1.5, render: (r) => <Text style={s.b}>{r.name}</Text> },
                  { key: 'location', title: 'Location', flex: 1, render: (r) => <Text style={s.t}>{r.district}</Text> },
                  { key: 'capacity', title: 'Capacity', flex: 0.7 },
                  { key: 'currentOccupancy', title: 'Occupancy', flex: 0.8 },
                  { key: 'status', title: 'Status', flex: 0.8, render: (r) => <Badge text={r.status} /> },
                  { key: 'actions', title: 'Actions', flex: 1.1, render: (r) => (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Btn small variant="secondary" label="View" onPress={() => setSel(r)} />
                      <Btn small variant="secondary" icon="create-outline" label="" onPress={() => router.push({ pathname: '/officer/shelter-form', params: { id: r.id } } as any)} />
                      <Btn small variant="danger" icon="trash-outline" label="" accessibilityLabel={`Delete ${r.name}`} onPress={() => remove(r)} />
                    </View>) },
                ]} />
              <View style={s.pager}>
                <Text style={s.t}>Showing {filtered.length ? (page - 1) * PAGE + 1 : 0} - {Math.min(page * PAGE, filtered.length)} of {filtered.length} shelters</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Btn small variant="secondary" icon="chevron-back" label="" disabled={page <= 1} onPress={() => setPage(page - 1)} />
                  <Text style={s.b}>{page} / {pages}</Text>
                  <Btn small variant="secondary" icon="chevron-forward" label="" disabled={page >= pages} onPress={() => setPage(page + 1)} />
                </View>
              </View>
            </View>
          </Card>
        </Col>

        <Col flex={1}>
          <Card title="Selected Shelter Details">
            {!sel ? <EmptyState icon="business-outline" text="Select a shelter to see details." /> : (
              <>
                <View style={s.selHead}><Text style={s.selName}>{sel.name}</Text><Badge text={sel.status} /></View>
                <KV label="Location">{`${sel.location}, ${sel.district}`}</KV>
                <KV label="Capacity">{String(sel.capacity)}</KV>
                <KV label="Occupancy">
                  <View style={{ width: '100%' }}>
                    <Text style={s.b}>{sel.currentOccupancy} ({pct}%)</Text>
                    <View style={s.bar}><View style={[s.fill, { width: `${pct}%`, backgroundColor: pct >= 100 ? O.danger : pct >= 85 ? '#F9A825' : O.success }]} /></View>
                  </View>
                </KV>
                <KV label="Facilities">{sel.facilities.length ? sel.facilities.join(', ') : '—'}</KV>
                {sel.notes ? <KV label="Notes">{sel.notes}</KV> : null}
                <Text style={[s.b, { marginTop: 14, marginBottom: 8 }]}>Location on Map</Text>
                <WebMap height={200} zoom={14} center={{ lat: sel.latitude, lng: sel.longitude }}
                  markers={[{ id: sel.id, lat: sel.latitude, lng: sel.longitude, label: sel.name, color: O.primary }]} />
                <Btn label="View Full Details / Edit" icon="arrow-forward" variant="secondary" style={{ marginTop: 14 }}
                  onPress={() => router.push({ pathname: '/officer/shelter-form', params: { id: sel.id } } as any)} />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  b: { fontSize: 13, fontWeight: '700', color: O.text }, t: { fontSize: 12, color: O.textMid },
  pager: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingHorizontal: 8, flexWrap: 'wrap', gap: 8 },
  selHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  selName: { fontSize: 17, fontWeight: '800', color: O.text, flex: 1 },
  bar: { height: 7, backgroundColor: '#E8EFED', borderRadius: 4, marginTop: 6, overflow: 'hidden' }, fill: { height: 7, borderRadius: 4 },
});
