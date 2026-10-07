import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Resource, ResourceDistribution, RESOURCE_CATEGORIES, ResourceCategory } from '../../types/resource';
import { fetchAllResources, createResource, updateResource, deleteResource, recordDistribution, fetchDistributions } from '../../services/resourceService';
import { logActivity } from '../../services/activityService';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { Badge, Btn, Card, Col, Field, FormModal, Input, KV, PageHeader, Row, Select, Spinner, StatCard, StatGrid, Table, Tabs, TextArea, useUI } from '../../components/officer/ui';
import { WebMap, searchLocation } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

const today = () => new Date().toISOString().slice(0, 10);
const RESOURCE_UNITS = ['Pieces', 'Bottles', 'Litres', 'Packs', 'Boxes', 'Kits', 'Cans', 'Bags', 'kg', 'Metres', 'Rolls', 'Tents', 'Blankets', 'Mats', 'Sheets', 'Pairs', 'Tubes', 'Bars'];

export default function ResourcesPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState('manage');
  const [resources, setResources] = useState<Resource[]>([]);
  const [dists, setDists] = useState<ResourceDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [rName, setRName] = useState(''); const [rCat, setRCat] = useState<string | null>(null); const [rUnit, setRUnit] = useState('');
  const [rTotal, setRTotal] = useState(''); const [rAvail, setRAvail] = useState('');

  const [dRes, setDRes] = useState<string | null>(null); const [dQty, setDQty] = useState(''); const [dDistrict, setDDistrict] = useState<string | null>(null);
  const [dDate, setDDate] = useState(today()); const [dNotes, setDNotes] = useState('');
  const [dLoc, setDLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState('All Categories');

  const load = useCallback(async () => {
    const [r, d] = await Promise.all([fetchAllResources(), fetchDistributions().catch(() => [])]);
    setResources(r); setDists(d); setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const selected = useMemo(() => resources.find((r) => r.name === dRes) ?? null, [resources, dRes]);
  useEffect(() => {
    if (!dDistrict) { setDLoc(null); return; }
    searchLocation(`${dDistrict} District, Sri Lanka`).then((r) => r && setDLoc({ lat: r.lat, lng: r.lng }));
  }, [dDistrict]);

  const openForm = (r?: Resource) => {
    setEditing(r ?? null); setRName(r?.name ?? ''); setRCat(r?.category ?? null); setRUnit(r?.unit ?? '');
    setRTotal(r ? String(r.totalQuantity) : ''); setRAvail(r ? String(r.availableQuantity) : ''); setFormOpen(true);
  };
  const saveResource = async () => {
    const total = parseInt(rTotal, 10); const avail = rAvail.trim() === '' ? total : parseInt(rAvail, 10);
    if (!rName.trim() || !rCat || !rUnit.trim() || isNaN(total) || isNaN(avail)) { toast('Fill name, category, unit and total quantity.', 'error'); return; }
    if (avail > total) { toast('Available quantity cannot exceed total.', 'error'); return; }
    try {
      setBusy(true);
      const p = { name: rName.trim(), category: rCat as ResourceCategory, unit: rUnit.trim(), totalQuantity: total, availableQuantity: avail };
      if (editing) await updateResource(editing.id, p); else await createResource(p);
      await logActivity({ type: 'resource', title: editing ? 'Resource updated' : 'Resource added', detail: `${p.name} — ${avail}/${total} ${p.unit}`, status: 'Success', createdBy: user?.uid });
      toast('Resource saved.'); setFormOpen(false); load();
    } catch (e: any) { toast(e?.message || 'Save failed', 'error'); } finally { setBusy(false); }
  };
  const removeResource = async (r: Resource) => {
    if (!(await confirm({ title: 'Remove resource', message: `Remove "${r.name}"?`, confirmLabel: 'Remove', danger: true }))) return;
    await deleteResource(r.id); toast('Resource removed.'); load();
  };

  const record = async () => {
    const qty = parseInt(dQty, 10);
    if (!selected || !dDistrict || !qty || qty < 1) { toast('Select a resource, quantity and district.', 'error'); return; }
    if (qty > selected.availableQuantity) { toast(`Only ${selected.availableQuantity.toLocaleString()} ${selected.unit} available.`, 'error'); return; }
    try {
      setBusy(true);
      await recordDistribution({ resourceId: selected.id, quantity: qty, district: dDistrict, distributionDate: dDate, notes: dNotes.trim() || undefined, recordedBy: user?.uid });
      await logActivity({ type: 'resource', title: 'Resource distribution recorded', detail: `${qty.toLocaleString()} ${selected.unit} ${selected.name} → ${dDistrict}`, location: dDistrict, status: 'Success', createdBy: user?.uid });
      toast('Distribution recorded. Stock updated.'); setDQty(''); setDNotes(''); load();
    } catch (e: any) { toast(e?.message || 'Could not record distribution', 'error'); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  const low = resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2).length;
  const shown = resources.filter((r) => filter === 'All Categories' || r.category === filter);

  return (
    <View>
      <PageHeader title={tab === 'record' ? 'Record Resource Distribution' : tab === 'history' ? 'Distribution History' : 'Manage Resources'}
        subtitle={tab === 'record' ? 'Enter distribution details for relief resources.' : 'Track relief stock and distribution across districts.'}
        actions={tab === 'manage' ? <Btn label="Add Resource" icon="add" onPress={() => openForm()} /> : undefined} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'manage', label: 'Manage Resources' }, { key: 'record', label: 'Record Distribution' }, { key: 'history', label: 'Distribution History', count: 0 }]} />

      {tab === 'manage' && (
        <>
          <StatGrid>
            <StatCard icon="cube" label="Resource Types" value={resources.length} tone="info" />
            <StatCard icon="layers" label="Units Available" value={resources.reduce((s, r) => s + r.availableQuantity, 0).toLocaleString()} tone="primary" />
            <StatCard icon="alert-circle" label="Low Stock (≤20%)" value={low} tone="danger" />
            <StatCard icon="send" label="Distributions" value={dists.length} tone="purple" />
          </StatGrid>
          <Card title="Relief Resources" action={<View style={{ width: 200 }}><Select value={filter} options={['All Categories', ...RESOURCE_CATEGORIES]} onChange={setFilter} /></View>}>
            <Table rows={shown} minWidth={700} empty="No resources yet. Add your first resource." columns={[
              { key: 'name', title: 'Resource', flex: 1.3, render: (r) => <Text style={s.b}>{r.name}</Text> }, { key: 'category', title: 'Category', flex: 1 },
              { key: 'stock', title: 'Available / Total', flex: 1.6, render: (r) => { const p = r.totalQuantity ? Math.round((r.availableQuantity / r.totalQuantity) * 100) : 0;
                return <View style={{ width: '100%' }}><Text style={s.t}>{r.availableQuantity.toLocaleString()} / {r.totalQuantity.toLocaleString()} {r.unit} ({p}%)</Text>
                  <View style={s.bar}><View style={[s.fill, { width: `${p}%`, backgroundColor: p > 50 ? O.success : p > 20 ? '#F9A825' : O.danger }]} /></View></View>; } },
              { key: 'st', title: 'Stock', flex: 0.8, render: (r) => { const p = r.totalQuantity ? r.availableQuantity / r.totalQuantity : 0; return <Badge text={p <= 0.2 ? 'Low' : 'Good'} tone={p <= 0.2 ? 'danger' : 'success'} />; } },
              { key: 'a', title: 'Actions', flex: 1.1, render: (r) => <View style={{ flexDirection: 'row', gap: 6 }}>
                <Btn small variant="secondary" icon="send-outline" label="Distribute" onPress={() => { setDRes(r.name); setTab('record'); }} />
                <Btn small variant="secondary" icon="create-outline" label="" accessibilityLabel={`Edit ${r.name}`} onPress={() => openForm(r)} /><Btn small variant="danger" icon="trash-outline" label="" accessibilityLabel={`Delete ${r.name}`} onPress={() => removeResource(r)} /></View> },
            ]} />
          </Card>
        </>
      )}

      {tab === 'record' && (
        <Row>
          <Col flex={1.5}>
            <Card title="Distribution Details">
              <Row breakAt="mobile" gap={14}>
                <Col flex={2}><Field label="Select Resource" required><Select value={dRes} options={resources.map((r) => r.name)} onChange={setDRes} placeholder="Select resource" /></Field></Col>
                <Col><Field label="Quantity" required><Input value={dQty} onChangeText={setDQty} keyboardType="number-pad" placeholder="e.g., 100" /></Field></Col>
                <Col><Field label="Unit"><Input value={selected?.unit ?? ''} editable={false} placeholder="—" /></Field></Col>
              </Row>
              <Row breakAt="mobile" gap={14}>
                <Col><Field label="Distribute To" required><Select value={dDistrict} options={SRI_LANKA_DISTRICTS} onChange={setDDistrict} placeholder="Select district or affected area" /></Field></Col>
                <Col><Field label="Distribution Date" required>
                  <View style={s.dateWrap}>{React.createElement('input', { type: 'date', value: dDate, onChange: (e: any) => setDDate(e.target.value),
                    style: { width: '100%', height: 42, border: 'none', outline: 'none', fontSize: 14, color: O.text, background: 'transparent', padding: '0 12px', fontFamily: 'inherit' } })}</View></Field></Col>
              </Row>
              <Field label="Additional Notes (Optional)"><TextArea value={dNotes} onChangeText={setDNotes} placeholder="Enter any additional notes (e.g., special instructions, recipient details, etc.)" /></Field>
              {selected && (
                <View style={s.avail}>
                  <View style={{ flex: 1.4 }}><Text style={s.availLabel}>Current Resource Availability</Text><Text style={s.availName}>{selected.name}</Text><Text style={s.t}>Category: {selected.category}</Text></View>
                  <View style={{ flex: 1 }}><Text style={s.availLabel}>Total Quantity</Text><Text style={s.availName}>{selected.totalQuantity.toLocaleString()}</Text></View>
                  <View style={{ flex: 1 }}><Text style={s.availLabel}>Available Quantity</Text><Text style={[s.availName, { color: O.primary }]}>{selected.availableQuantity.toLocaleString()}</Text></View>
                  <View style={{ flex: 0.7 }}><Text style={s.availLabel}>Unit</Text><Text style={s.availName}>{selected.unit}</Text></View>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="secondary" onPress={() => { setDQty(''); setDNotes(''); setDDistrict(null); }} />
                <Btn label="Record Distribution" icon="cube-outline" loading={busy} onPress={record} />
              </View>
            </Card>
          </Col>
          <Col flex={1}>
            <Card title="Selected Location / Area">
              <KV label="Name">{dDistrict ? `${dDistrict} — Affected Area` : '—'}</KV><KV label="Type">District</KV><KV label="District">{dDistrict || '—'}</KV>
              <View style={{ marginTop: 12 }}><WebMap height={200} zoom={10} center={dLoc ?? undefined} markers={dLoc ? [{ id: 'd', lat: dLoc.lat, lng: dLoc.lng, label: dDistrict || '', color: O.danger }] : []} /></View>
            </Card>
            <Card title="Recent Distributions" action={<Btn small variant="ghost" label="View All" onPress={() => setTab('history')} />}>
              <Table minWidth={320} rows={dists.slice(0, 4)} empty="No distributions yet." columns={[
                { key: 'distributionDate', title: 'Date', flex: 1 }, { key: 'resourceName', title: 'Resource', flex: 1.2 },
                { key: 'quantity', title: 'Qty', flex: 0.7, render: (d) => <Text style={s.t}>{d.quantity.toLocaleString()}</Text> }, { key: 'district', title: 'To', flex: 1 }]} />
            </Card>
          </Col>
        </Row>
      )}

      {tab === 'history' && (
        <Card title="All Distributions">
          <Table rows={dists} minWidth={640} empty="No distributions recorded yet." columns={[
            { key: 'distributionDate', title: 'Date', flex: 1 }, { key: 'resourceName', title: 'Resource', flex: 1.3, render: (d) => <Text style={s.b}>{d.resourceName}</Text> },
            { key: 'quantity', title: 'Quantity', flex: 1, render: (d) => <Text style={s.t}>{d.quantity.toLocaleString()} {d.unit}</Text> },
            { key: 'district', title: 'Distributed To', flex: 1 }, { key: 'notes', title: 'Notes', flex: 1.6, render: (d) => <Text style={s.t}>{d.notes || '—'}</Text> }]} />
        </Card>
      )}

      <FormModal visible={formOpen} title={editing ? 'Edit Resource' : 'Add Resource'} onClose={() => setFormOpen(false)}>
        <Field label="Name" required><Input value={rName} onChangeText={setRName} placeholder="e.g., Drinking Water" /></Field>
        <Field label="Category" required><Select value={rCat} options={RESOURCE_CATEGORIES} onChange={setRCat} /></Field>
        <Field label="Unit" required><Select value={rUnit || null} options={RESOURCE_UNITS} onChange={(value) => setRUnit(value || '')} placeholder="Select unit" /></Field>
        <Row breakAt="mobile" gap={12}><Col><Field label="Total Quantity" required><Input value={rTotal} onChangeText={setRTotal} keyboardType="number-pad" /></Field></Col>
          <Col><Field label="Available Quantity" hint="Defaults to total"><Input value={rAvail} onChangeText={setRAvail} keyboardType="number-pad" /></Field></Col></Row>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}><Btn label="Cancel" variant="secondary" onPress={() => setFormOpen(false)} /><Btn label="Save Resource" icon="save-outline" loading={busy} onPress={saveResource} /></View>
      </FormModal>
    </View>
  );
}
const s = StyleSheet.create({
  b: { fontSize: 13, fontWeight: '700', color: O.text }, t: { fontSize: 12, color: O.textMid },
  bar: { height: 6, backgroundColor: '#E8EFED', borderRadius: 3, marginTop: 5, overflow: 'hidden' }, fill: { height: 6, borderRadius: 3 },
  dateWrap: { borderWidth: 1, borderColor: '#CFDDD9', borderRadius: 10, backgroundColor: '#fff', minHeight: 44, justifyContent: 'center' },
  avail: { flexDirection: 'row', gap: 12, backgroundColor: '#F3F9F7', borderRadius: 12, padding: 16, marginBottom: 14, flexWrap: 'wrap' },
  availLabel: { fontSize: 11, color: O.textMuted, fontWeight: '600', marginBottom: 4 }, availName: { fontSize: 16, fontWeight: '800', color: O.text },
});
