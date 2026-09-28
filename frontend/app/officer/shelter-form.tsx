import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SHELTER_FACILITIES } from '../../types/shelter';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { createShelter, updateShelter, fetchShelterById, deriveShelterStatus } from '../../services/shelterService';
import { logActivity } from '../../services/activityService';
import { Badge, Btn, Card, Checkbox, Col, Field, Input, KV, PageHeader, Row, Select, Spinner, TextArea, useUI } from '../../components/officer/ui';
import { WebMap, reverseLocation, searchLocation } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

export default function ShelterForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { user } = useAuth();
  const { toast } = useUI();
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [occupancy, setOccupancy] = useState('0');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [closed, setClosed] = useState(false);
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchShelterById(id as string).then((s) => {
      if (s) {
        setName(s.name); setDistrict(s.district); setLocation(s.location); setCapacity(String(s.capacity));
        setOccupancy(String(s.currentOccupancy)); setFacilities(s.facilities); setNotes(s.notes || '');
        setClosed(s.status === 'Closed'); setPick({ lat: s.latitude, lng: s.longitude });
      }
      setLoading(false);
    });
  }, [id]);

  const cap = parseInt(capacity, 10) || 0;
  const occ = parseInt(occupancy, 10) || 0;
  const status = deriveShelterStatus(cap, occ, closed);
  const toggle = (f: string) => setFacilities((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const onPick = async (lat: number, lng: number) => {
    setPick({ lat, lng });
    if (!location.trim()) { const a = await reverseLocation(lat, lng); if (a) setLocation(a); }
  };
  const doSearch = async () => {
    const r = await searchLocation(search);
    if (r) { setPick({ lat: r.lat, lng: r.lng }); if (!location.trim()) setLocation(r.name); } else toast('Location not found', 'error');
  };

  const save = async () => {
    if (!name.trim() || !district || !location.trim() || !cap) { toast('Please fill shelter name, district, address and capacity.', 'error'); return; }
    if (occ > cap) { toast('Occupancy cannot exceed capacity.', 'error'); return; }
    if (!pick) { toast('Please select the shelter location on the map.', 'error'); return; }
    try {
      setSaving(true);
      const payload = { name: name.trim(), district, location: location.trim(), latitude: pick.lat, longitude: pick.lng, capacity: cap,
        currentOccupancy: occ, facilities, status, notes: notes.trim() || undefined };
      if (editing) await updateShelter(id as string, payload); else await createShelter(payload);
      await logActivity({ type: 'shelter', title: editing ? 'Shelter updated' : 'Shelter registered', detail: `${name.trim()} — capacity ${cap}, occupancy ${occ}`, location: district, status: 'Success', createdBy: user?.uid });
      toast(editing ? 'Shelter updated.' : 'Shelter registered.');
      router.replace('/officer/shelters' as any);
    } catch (e: any) { toast(e?.message || 'Save failed', 'error'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  const dash = (v: string) => v || '-';

  return (
    <View>
      <PageHeader title={editing ? 'Edit Shelter Details' : 'Register Shelter Details'} subtitle="Enter shelter details to register a new emergency shelter in the system." />
      <Row>
        <Col flex={1.5}>
          <Card title="Shelter Information">
            <Row breakAt="mobile" gap={14}>
              <Col><Field label="Shelter Name" required><Input value={name} onChangeText={setName} placeholder="Enter shelter name" /></Field></Col>
              <Col><Field label="District" required><Select value={district} options={SRI_LANKA_DISTRICTS} onChange={setDistrict} placeholder="Select district" /></Field></Col>
            </Row>
            <Field label="Location / Address" required><TextArea value={location} onChangeText={setLocation} placeholder="Enter full address or location details" /></Field>
            <Row breakAt="mobile" gap={14}>
              <Col><Field label="Capacity" required><Input value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="e.g., 500" /></Field></Col>
              <Col><Field label="Current Occupancy"><Input value={occupancy} onChangeText={setOccupancy} keyboardType="number-pad" placeholder="e.g., 0" /></Field></Col>
            </Row>
            <Field label="Facilities">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {SHELTER_FACILITIES.map((f) => <Checkbox key={f} label={f} checked={facilities.includes(f)} onToggle={() => toggle(f)} />)}
              </View>
            </Field>
            <Field label="Availability"><Checkbox label="Mark shelter as closed" checked={closed} onToggle={() => setClosed(!closed)} /></Field>
            <Field label="Additional Notes"><TextArea value={notes} onChangeText={setNotes} placeholder="Enter any additional information (optional)" /></Field>
          </Card>
        </Col>
        <Col flex={1}>
          <Card title="Select Location on Map">
            <Field><Input icon="search" value={search} onChangeText={setSearch} placeholder="Search for a location…" onSubmitEditing={doSearch} /></Field>
            <WebMap height={260} pickable pick={pick} onPick={onPick} center={pick ? { lat: pick.lat, lng: pick.lng } : undefined} />
            <Text style={s.hint}>{pick ? `Pinned: ${pick.lat.toFixed(4)}, ${pick.lng.toFixed(4)}` : 'Click the map to place the shelter pin.'}</Text>
          </Card>
          <Card title="Preview Details">
            <KV label="Shelter Name">{dash(name)}</KV>
            <KV label="District">{dash(district || '')}</KV>
            <KV label="Location">{dash(location)}</KV>
            <KV label="Capacity">{cap ? String(cap) : '-'}</KV>
            <KV label="Facilities">{facilities.length ? facilities.join(', ') : '-'}</KV>
            <KV label="Status">{cap ? <Badge text={status} /> : '-'}</KV>
          </Card>
        </Col>
      </Row>
      <View style={s.footer}>
        <Btn label="Cancel" variant="secondary" onPress={() => router.back()} />
        <Btn label={editing ? 'Save Changes' : 'Save Shelter'} icon="save-outline" loading={saving} onPress={save} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({ hint: { fontSize: 12, color: O.textMuted, marginTop: 8 }, footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 30 } });
