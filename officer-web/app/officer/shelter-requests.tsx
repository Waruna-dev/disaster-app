import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Shelter, ShelterRequest } from '../../types/shelter';
import { fetchAllShelters } from '../../services/shelterService';
import { fetchAllShelterRequests, assignShelterToRequest, syncShelterOccupanciesFromAssignedRequests, updateShelterRequestStatus } from '../../services/shelterRequestService';
import { logActivity } from '../../services/activityService';
import { Badge, Btn, Card, Col, EmptyState, Field, KV, PageHeader, Row, Select, Spinner, Table, Tabs, TextArea, fmtDateTime, useUI } from '../../components/officer/ui';
import { WebMap } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

export default function ShelterRequests() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [reqs, setReqs] = useState<ShelterRequest[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Pending');
  const [sel, setSel] = useState<ShelterRequest | null>(null);
  const [shelterName, setShelterName] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await syncShelterOccupanciesFromAssignedRequests();
    const [r, s] = await Promise.all([fetchAllShelterRequests(), fetchAllShelters()]);
    setReqs(r); setShelters(s);
    setSel((c) => (c ? r.find((x) => x.id === c.id) ?? null : null));
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  useEffect(() => { setShelterName(null); setNotes(''); }, [sel?.id]);

  const rows = useMemo(() => (tab === 'All' ? reqs : reqs.filter((r) => r.status === tab)), [reqs, tab]);

  const options = useMemo(() => {
    if (!sel) return [] as Shelter[];
    const open = shelters.filter((s) => s.status === 'Available' || s.status === 'Limited');
    return [...open].sort((a, b) => Number(b.district === sel.district) - Number(a.district === sel.district));
  }, [sel, shelters]);
  const labelOf = (s: Shelter) => `${s.name} — ${s.district} (${s.capacity - s.currentOccupancy} free)`;

  const assign = async () => {
    const shelter = options.find((s) => labelOf(s) === shelterName);
    if (!sel || !shelter) { toast('Select a shelter to assign.', 'error'); return; }
    try {
      setBusy(true);
      await assignShelterToRequest(sel.id, shelter.id, shelter.name, notes.trim() || undefined);
      await logActivity({ type: 'shelter', title: 'Shelter assigned to request', detail: `${sel.userName || 'Resident'} (${sel.peopleCount} ppl) → ${shelter.name}`, location: shelter.district, status: 'Success', createdBy: user?.uid });
      toast('Shelter assigned. The citizen can see the update.'); load();
    } catch (e: any) { toast(e?.message || 'Could not assign', 'error'); } finally { setBusy(false); }
  };
  const reject = async () => {
    if (!sel) return;
    if (!(await confirm({ title: 'Reject request', message: 'Reject this shelter request? The citizen will see it as Rejected.', confirmLabel: 'Reject', danger: true }))) return;
    await updateShelterRequestStatus(sel.id, 'Rejected', notes.trim() || undefined);
    await logActivity({ type: 'shelter', title: 'Shelter request rejected', detail: sel.userName || 'Resident', location: sel.district, status: 'Info', createdBy: user?.uid });
    toast('Request rejected.'); load();
  };
  const complete = async () => {
    if (!sel) return;
    await updateShelterRequestStatus(sel.id, 'Completed');
    toast('Marked as completed.'); load();
  };

  if (loading) return <Spinner />;
  const count = (k: string) => reqs.filter((r) => r.status === k).length;

  return (
    <View>
      <PageHeader title="Citizen Shelter Requests" subtitle="Review requests from citizens and assign a suitable shelter."
        actions={<Btn label="Back to Shelters" icon="arrow-back" variant="secondary" onPress={() => router.push('/officer/shelters' as any)} />} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'Pending', label: 'Pending', count: count('Pending') }, { key: 'Assigned', label: 'Assigned' }, { key: 'Rejected', label: 'Rejected' }, { key: 'All', label: 'All' }]} />
      <Row>
        <Col flex={1.5}>
          <Card padded={false}><View style={{ padding: 12 }}>
            <Table rows={rows} selectedId={sel?.id} onRowPress={setSel} empty="No requests in this category." minWidth={620}
              columns={[
                { key: 'userName', title: 'Citizen', flex: 1.1, render: (r) => <Text style={s.b}>{r.userName || 'Resident'}</Text> },
                { key: 'address', title: 'Location', flex: 1.6, render: (r) => <Text style={s.t} numberOfLines={2}>{r.address}</Text> },
                { key: 'peopleCount', title: 'People', flex: 0.6 },
                { key: 'status', title: 'Status', flex: 0.8, render: (r) => <Badge text={r.status} /> },
                { key: 'createdAt', title: 'Requested', flex: 1, render: (r) => <Text style={s.t}>{fmtDateTime(r.createdAt)}</Text> },
              ]} />
          </View></Card>
        </Col>
        <Col flex={1}>
          <Card title="Request details">
            {!sel ? <EmptyState icon="mail-open-outline" text="Select a request to review." /> : (
              <>
                <WebMap height={180} zoom={14} center={{ lat: sel.latitude, lng: sel.longitude }}
                  markers={[{ id: 'req', lat: sel.latitude, lng: sel.longitude, label: 'Citizen location', color: O.danger },
                    ...options.slice(0, 5).map((o) => ({ id: o.id, lat: o.latitude, lng: o.longitude, label: o.name, color: O.primary }))]} />
                <View style={{ marginTop: 10 }}>
                  <KV label="Citizen">{sel.userName || 'Resident'}</KV>
                  {sel.contactNumber ? <KV label="Contact">{sel.contactNumber}</KV> : null}
                  <KV label="People">{String(sel.peopleCount)}</KV>
                  <KV label="Address">{sel.address}</KV>
                  <KV label="Situation">{sel.description}</KV>
                  <KV label="Status"><Badge text={sel.status} /></KV>
                  {sel.shelterName ? <KV label="Shelter">{sel.shelterName}</KV> : null}
                </View>
                {sel.status === 'Pending' && (
                  <View style={{ marginTop: 14 }}>
                    <Field label="Assign shelter" hint="Nearest / same-district shelters with free capacity are listed first.">
                      <Select value={shelterName} options={options.map(labelOf)} onChange={setShelterName} placeholder="Select a shelter" />
                    </Field>
                    <Field label="Note to citizen (optional)"><TextArea value={notes} onChangeText={setNotes} placeholder="e.g., Bring ID and essential medicines." /></Field>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Btn label="Assign Shelter" icon="checkmark" loading={busy} onPress={assign} />
                      <Btn label="Reject" variant="danger" onPress={reject} />
                    </View>
                  </View>
                )}
                {sel.status === 'Assigned' && <Btn label="Mark as Completed" icon="checkmark-done" variant="success" style={{ marginTop: 14 }} onPress={complete} />}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </View>
  );
}
const s = StyleSheet.create({ b: { fontSize: 13, fontWeight: '700', color: O.text }, t: { fontSize: 12, color: O.textMid } });
