import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Warning, RiskLevel, RISK_LEVELS } from '../../types/alert';
import { createWarning, cancelWarning, deleteWarning } from '../../services/alertService';
import { logActivity } from '../../services/activityService';
import { Badge, Btn, Card, Col, Field, FormModal, Input, KV, PageHeader, Row, Select, Spinner, Table, Tabs, TextArea, fmtDateTime, useUI } from '../../components/officer/ui';
import { WebMap, searchLocation } from '../../components/officer/WebMap';
import { O, RISK_COLOR } from '../../components/officer/theme';

const EXPIRY: Record<string, number> = { '6 hours': 6, '12 hours': 12, '24 hours': 24, '48 hours': 48, '72 hours': 72 };

export default function HazardAlerts() {
  const { user, userProfile } = useAuth();
  const { toast, confirm } = useUI();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Active');
  const [selected, setSelected] = useState<Warning | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [hazard, setHazard] = useState<string | null>('flood');
  const [risk, setRisk] = useState<string | null>('HIGH');
  const [area, setArea] = useState('');
  const [radius, setRadius] = useState<string | null>('1000');
  const [expiry, setExpiry] = useState<string | null>('24 hours');
  const [message, setMessage] = useState('');
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const snap = await getDocs(query(collection(db, 'warnings'), orderBy('createdAt', 'desc')));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Warning));
    setWarnings(rows);
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  // Treat warnings past their expiry as Expired for display purposes.
  const rows = useMemo(() => warnings.map((w) => {
    const exp = w.expiresAt?.toDate?.();
    return w.status === 'Active' && exp && exp.getTime() < Date.now() ? { ...w, status: 'Expired' as const } : w;
  }), [warnings]);
  const filtered = rows.filter((w) => tab === 'All' || w.status === tab);

  const openForm = () => {
    setTitle(''); setHazard('flood'); setRisk('HIGH'); setArea(''); setRadius('1000'); setExpiry('24 hours'); setMessage(''); setPick(null); setSearch('');
    setOpen(true);
  };

  const doSearch = async () => {
    const r = await searchLocation(search + ', Sri Lanka');
    if (r) { setPick({ lat: r.lat, lng: r.lng }); if (!area) setArea(search); } else toast('Location not found', 'error');
  };

  const save = async () => {
    if (!title.trim() || !area.trim() || !message.trim() || !pick) { toast('Fill title, area, message and pick a map location.', 'error'); return; }
    try {
      setSaving(true);
      await createWarning({
        title: title.trim(), hazardType: hazard as any, riskLevel: risk as RiskLevel, affectedArea: area.trim(),
        latitude: pick.lat, longitude: pick.lng, radius: parseInt(radius || '1000', 10), message: message.trim(),
        expiresAt: new Date(Date.now() + EXPIRY[expiry || '24 hours'] * 3600 * 1000),
        createdBy: user!.uid, createdByName: (userProfile as any)?.fullName ?? null,
      });
      await logActivity({ type: 'alert', title: `Hazard alert: ${title.trim()}`, detail: `${risk} risk — ${area.trim()}`, location: area.trim(), status: 'In Progress', createdBy: user?.uid });
      toast('Hazard alert published to citizens.');
      setOpen(false);
      load();
    } catch (e: any) { toast(e?.message || 'Could not publish alert', 'error'); } finally { setSaving(false); }
  };

  const cancel = async (w: Warning) => {
    if (!(await confirm({ title: 'Cancel alert', message: `Cancel "${w.title}"? Citizens will no longer see it as active.`, confirmLabel: 'Cancel alert', danger: true }))) return;
    await cancelWarning(w.id); toast('Alert cancelled.'); load();
  };
  const remove = async (w: Warning) => {
    if (!(await confirm({ title: 'Delete alert', message: `Permanently delete "${w.title}"?`, confirmLabel: 'Delete', danger: true }))) return;
    await deleteWarning(w.id); setSelected(null); toast('Alert deleted.'); load();
  };

  if (loading) return <Spinner />;
  const counts = (k: string) => rows.filter((w) => w.status === k).length;

  return (
    <View>
      <PageHeader title="Hazard Alerts" subtitle="Publish and manage public hazard warnings for affected areas."
        actions={<Btn label="Create Alert" icon="add" onPress={openForm} />} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'Active', label: 'Active', count: counts('Active') }, { key: 'Expired', label: 'Expired' },
        { key: 'Cancelled', label: 'Cancelled' }, { key: 'All', label: 'All' }]} />

      <Row>
        <Col flex={1.6}>
          <Card padded={false}>
            <View style={{ padding: 12 }}>
              <Table rows={filtered} selectedId={selected?.id} onRowPress={setSelected} empty="No alerts in this category."
                columns={[
                  { key: 'title', title: 'Alert', flex: 1.6, render: (w) => <View><Text style={s.t}>{w.title}</Text><Text style={s.sub}>{w.affectedArea}</Text></View> },
                  { key: 'hazardType', title: 'Type', flex: 0.8, render: (w) => <Text style={s.t}>{w.hazardType === 'flood' ? 'Flood' : 'Landslide'}</Text> },
                  { key: 'riskLevel', title: 'Risk', flex: 0.8, render: (w) => <Badge text={w.riskLevel} /> },
                  { key: 'status', title: 'Status', flex: 0.8, render: (w) => <Badge text={w.status} /> },
                  { key: 'createdAt', title: 'Issued', flex: 1, render: (w) => <Text style={s.sub}>{fmtDateTime(w.createdAt)}</Text> },
                ]} />
            </View>
          </Card>
        </Col>
        <Col flex={1}>
          <Card title="Alert details">
            {!selected ? <Text style={s.sub}>Select an alert to see its details on the map.</Text> : (
              <>
                <WebMap height={200} zoom={12} center={{ lat: selected.latitude, lng: selected.longitude }}
                  markers={[{ id: selected.id, lat: selected.latitude, lng: selected.longitude, label: selected.title, color: RISK_COLOR[selected.riskLevel] }]}
                  circles={[{ lat: selected.latitude, lng: selected.longitude, radius: selected.radius, color: RISK_COLOR[selected.riskLevel] }]} />
                <View style={{ marginTop: 12 }}>
                  <KV label="Title">{selected.title}</KV>
                  <KV label="Risk"><Badge text={selected.riskLevel} /></KV>
                  <KV label="Area">{selected.affectedArea}</KV>
                  <KV label="Radius">{`${selected.radius} m`}</KV>
                  <KV label="Expires">{fmtDateTime(selected.expiresAt)}</KV>
                  <KV label="Message">{selected.message}</KV>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {selected.status === 'Active' && <Btn small variant="danger" label="Cancel alert" onPress={() => cancel(selected)} />}
                  <Btn small variant="secondary" icon="trash-outline" label="Delete" onPress={() => remove(selected)} />
                </View>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <FormModal visible={open} title="Create Hazard Alert" onClose={() => setOpen(false)} width={720}>
        <Row breakAt="mobile">
          <Col flex={1}>
            <Field label="Alert title" required><Input value={title} onChangeText={setTitle} placeholder="e.g., Flood Warning" /></Field>
            <Row breakAt="mobile" gap={12}>
              <Col><Field label="Hazard type" required><Select value={hazard} options={['flood', 'landslide']} onChange={setHazard} /></Field></Col>
              <Col><Field label="Risk level" required><Select value={risk} options={RISK_LEVELS} onChange={setRisk} /></Field></Col>
            </Row>
            <Field label="Affected area" required><Input value={area} onChangeText={setArea} placeholder="e.g., Kandy, Central Province" /></Field>
            <Row breakAt="mobile" gap={12}>
              <Col><Field label="Radius (m)"><Select value={radius} options={['300', '500', '1000', '2000']} onChange={setRadius} /></Field></Col>
              <Col><Field label="Expires in"><Select value={expiry} options={Object.keys(EXPIRY)} onChange={setExpiry} /></Field></Col>
            </Row>
            <Field label="Public message" required><TextArea value={message} onChangeText={setMessage} placeholder="Instructions shown to citizens…" /></Field>
          </Col>
          <Col flex={1}>
            <Field label="Location on map" required hint="Search or click the map to drop the alert centre.">
              <Input icon="search" value={search} onChangeText={setSearch} placeholder="Search for a location…" onSubmitEditing={doSearch} />
            </Field>
            <WebMap height={300} pickable pick={pick} onPick={(lat, lng) => setPick({ lat, lng })}
              circles={pick ? [{ lat: pick.lat, lng: pick.lng, radius: parseInt(radius || '1000', 10), color: RISK_COLOR[risk || 'HIGH'] }] : []} />
            <Text style={[s.sub, { marginTop: 6 }]}>{pick ? `Selected: ${pick.lat.toFixed(4)}, ${pick.lng.toFixed(4)}` : 'No location selected'}</Text>
          </Col>
        </Row>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
          <Btn label="Publish Alert" icon="megaphone" loading={saving} onPress={save} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({ t: { fontSize: 13, fontWeight: '700', color: O.text }, sub: { fontSize: 12, color: O.textMuted } });
