import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { RescueTeam, RESCUE_TEAM_TYPES, RescueTeamStatus, RescueTeamType } from '../../types/rescueTeam';
import { fetchAllRescueTeams, createRescueTeam, updateRescueTeam, deleteRescueTeam } from '../../services/rescueTeamService';
import { fetchAllRescueRequests } from '../../services/rescueRequestService';
import { createAssignment, fetchAssignments, completeAssignment, RescueAssignment } from '../../services/rescueAssignmentService';
import { logActivity } from '../../services/activityService';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { Badge, Btn, Card, Col, EmptyState, Field, FormModal, Input, KV, PageHeader, Row, Select, Spinner, Table, TextArea, fmtDateTime, useUI } from '../../components/officer/ui';
import { WebMap, searchLocation } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

export default function RescueTeamsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [assignments, setAssignments] = useState<RescueAssignment[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('All Districts');
  const [status, setStatus] = useState('All Status');
  const [sel, setSel] = useState<RescueTeam | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // add / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RescueTeam | null>(null);
  const [fName, setFName] = useState(''); const [fType, setFType] = useState<string | null>(null);
  const [fDistrict, setFDistrict] = useState<string | null>(null); const [fMembers, setFMembers] = useState('');
  const [fEquip, setFEquip] = useState(''); const [fStatus, setFStatus] = useState<string | null>('Available');
  const [fPick, setFPick] = useState<{ lat: number; lng: number } | null>(null); const [fSearch, setFSearch] = useState('');

  const load = useCallback(async () => {
    const [t, a, r] = await Promise.all([fetchAllRescueTeams(), fetchAssignments().catch(() => []), fetchAllRescueRequests().catch(() => [])]);
    setTeams(t); setAssignments(a); setPending(r.filter((x) => x.status === 'Pending').length);
    setSel((c) => (c ? t.find((x) => x.id === c.id) ?? null : t[0] ?? null));
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => teams.filter((t) =>
    (district === 'All Districts' || t.district === district) && (status === 'All Status' || t.status === status) &&
    (!q.trim() || `${t.name} ${t.type} ${t.district}`.toLowerCase().includes(q.trim().toLowerCase()))), [teams, q, district, status]);

  const areaOptions = useMemo(() => Array.from(new Set(SRI_LANKA_DISTRICTS.map((d) => `${d} — Affected Area`))), []);

  const assign = async () => {
    if (!sel || !area) { toast('Select a team and an affected area.', 'error'); return; }
    if (sel.status !== 'Available') { toast('Only available teams can be assigned.', 'error'); return; }
    try {
      setBusy(true);
      await createAssignment({ teamId: sel.id, teamName: sel.name, area, notes: notes.trim() || undefined, createdBy: user?.uid });
      await updateRescueTeam(sel.id, { status: 'On Mission' });
      await logActivity({ type: 'rescue', title: 'Rescue team assigned', detail: `${sel.name} → ${area}`, location: area.split(' — ')[0], status: 'In Progress', createdBy: user?.uid });
      toast(`${sel.name} assigned to ${area}.`); setArea(null); setNotes(''); load();
    } catch (e: any) { toast(e?.message || 'Assignment failed', 'error'); } finally { setBusy(false); }
  };

  const finish = async (a: RescueAssignment) => {
    await completeAssignment(a.id); await updateRescueTeam(a.teamId, { status: 'Available' });
    await logActivity({ type: 'rescue', title: 'Rescue mission completed', detail: `${a.teamName} — ${a.area}`, location: a.area.split(' — ')[0], status: 'Completed', createdBy: user?.uid });
    toast('Mission completed. Team is available again.'); load();
  };

  const openForm = (t?: RescueTeam) => {
    setEditing(t ?? null); setFName(t?.name ?? ''); setFType(t?.type ?? null); setFDistrict(t?.district ?? null);
    setFMembers(t ? String(t.members) : ''); setFEquip(t?.equipment ?? ''); setFStatus(t?.status ?? 'Available');
    setFPick(t ? { lat: t.latitude, lng: t.longitude } : null); setFSearch(''); setFormOpen(true);
  };
  const saveTeam = async () => {
    const m = parseInt(fMembers, 10);
    if (!fName.trim() || !fType || !fDistrict || !m) { toast('Fill team name, type, district and members.', 'error'); return; }
    if (!fPick) { toast('Pin the team base location on the map.', 'error'); return; }
    try {
      setBusy(true);
      const payload = { name: fName.trim(), type: fType as RescueTeamType, district: fDistrict, members: m, equipment: fEquip.trim() || undefined,
        status: fStatus as RescueTeamStatus, latitude: fPick.lat, longitude: fPick.lng, currentLocationLabel: fDistrict };
      if (editing) await updateRescueTeam(editing.id, payload); else await createRescueTeam(payload);
      await logActivity({ type: 'rescue', title: editing ? 'Rescue team updated' : 'Rescue team registered', detail: fName.trim(), location: fDistrict, status: 'Success', createdBy: user?.uid });
      toast('Team saved.'); setFormOpen(false); load();
    } catch (e: any) { toast(e?.message || 'Save failed', 'error'); } finally { setBusy(false); }
  };
  const remove = async (t: RescueTeam) => {
    if (!(await confirm({ title: 'Remove team', message: `Remove "${t.name}"?`, confirmLabel: 'Remove', danger: true }))) return;
    await deleteRescueTeam(t.id); toast('Team removed.'); load();
  };
  const doSearch = async () => { const r = await searchLocation(fSearch + ', Sri Lanka'); if (r) setFPick({ lat: r.lat, lng: r.lng }); else toast('Location not found', 'error'); };

  if (loading) return <Spinner />;
  const active = assignments.filter((a) => a.status === 'In Progress');

  return (
    <View>
      <PageHeader title="Assign Rescue Team" subtitle="View available rescue teams and assign a team to the selected affected area."
        actions={<>
          <Btn label={`Citizen Requests${pending ? ` (${pending})` : ''}`} icon="mail-unread-outline" variant="secondary" onPress={() => router.push('/officer/rescue-requests' as any)} />
          <Btn label="Add Rescue Team" icon="add" onPress={() => openForm()} />
        </>} />
      <Row>
        <Col flex={1.6}>
          <Card title="Available Rescue Teams">
            <Row breakAt="mobile" gap={10} style={{ marginBottom: 12 }}>
              <Col flex={2}><Input icon="search" value={q} onChangeText={setQ} placeholder="Search team name or type..." /></Col>
              <Col><Select value={district} options={['All Districts', ...SRI_LANKA_DISTRICTS]} onChange={setDistrict} /></Col>
              <Col><Select value={status} options={['All Status', 'Available', 'On Mission', 'Unavailable']} onChange={setStatus} /></Col>
            </Row>
            <Table rows={filtered} selectedId={sel?.id} onRowPress={setSel} minWidth={680} empty="No rescue teams found."
              columns={[
                { key: 'name', title: 'Team Name', flex: 1.4, render: (t) => <Text style={s.b}>{t.name}</Text> },
                { key: 'type', title: 'Type', flex: 1.1 }, { key: 'district', title: 'District', flex: 0.9 },
                { key: 'status', title: 'Current Status', flex: 0.9, render: (t) => <Badge text={t.status} /> },
                { key: 'a', title: 'Actions', flex: 1.2, render: (t) => (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Btn small label={t.status === 'Available' ? 'Assign' : 'View'} variant={t.status === 'Available' ? 'primary' : 'secondary'} onPress={() => setSel(t)} />
                    <Btn small variant="secondary" icon="create-outline" label="" onPress={() => openForm(t)} />
                    <Btn small variant="danger" icon="trash-outline" label="" onPress={() => remove(t)} />
                  </View>) },
              ]} />
          </Card>

          <Card title="Assignment Details">
            {!sel ? <Text style={s.t}>Select an available team above.</Text> : (
              <>
                <Text style={[s.t, { marginBottom: 12 }]}>Assigning: <Text style={s.b}>{sel.name}</Text> ({sel.status})</Text>
                <Row breakAt="mobile" gap={14}>
                  <Col><Field label="Select Affected Area" required><Select value={area} options={areaOptions} onChange={setArea} placeholder="Select affected area" /></Field></Col>
                  <Col><Field label="Assignment Notes (Optional)"><TextArea value={notes} onChangeText={setNotes} placeholder="Enter any additional notes..." /></Field></Col>
                </Row>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                  <Btn label="Cancel" variant="secondary" onPress={() => { setArea(null); setNotes(''); }} />
                  <Btn label="Confirm Assignment" icon="checkmark" loading={busy} disabled={sel.status !== 'Available'} onPress={assign} />
                </View>
              </>
            )}
          </Card>

          <Card title="Active Missions">
            <Table rows={active} minWidth={520} empty="No active missions." columns={[
              { key: 'teamName', title: 'Team', flex: 1.2 }, { key: 'area', title: 'Area', flex: 1.4 },
              { key: 'createdAt', title: 'Since', flex: 1, render: (a) => <Text style={s.t}>{fmtDateTime(a.createdAt)}</Text> },
              { key: 'x', title: '', flex: 1, render: (a) => <Btn small variant="success" label="Complete" onPress={() => finish(a)} /> }]} />
          </Card>
        </Col>

        <Col flex={1}>
          <Card title="Selected Team Information">
            {!sel ? <EmptyState icon="people-outline" text="No team selected." /> : (
              <>
                <KV label="Team Name">{sel.name}</KV><KV label="Type">{sel.type}</KV><KV label="District">{sel.district}</KV>
                <KV label="Members">{String(sel.members)}</KV><KV label="Equipment">{sel.equipment || '—'}</KV>
                <KV label="Status"><Badge text={sel.status} /></KV>
              </>
            )}
          </Card>
          <Card title="Team Current Location">
            <WebMap height={240} zoom={11} center={sel ? { lat: sel.latitude, lng: sel.longitude } : undefined} selectedId={sel?.id} onMarkerPress={(id) => setSel(teams.find((t) => t.id === id) ?? null)}
              markers={teams.map((t) => ({ id: t.id, lat: t.latitude, lng: t.longitude, label: t.name, sub: t.status, color: t.status === 'Available' ? O.success : t.status === 'On Mission' ? O.info : O.neutral }))} />
          </Card>
        </Col>
      </Row>

      <FormModal visible={formOpen} title={editing ? 'Edit Rescue Team' : 'Add Rescue Team'} onClose={() => setFormOpen(false)} width={720}>
        <Row breakAt="mobile">
          <Col>
            <Field label="Team Name" required><Input value={fName} onChangeText={setFName} placeholder="e.g., Kandy Rescue Team" /></Field>
            <Field label="Type" required><Select value={fType} options={RESCUE_TEAM_TYPES} onChange={setFType} /></Field>
            <Field label="District" required><Select value={fDistrict} options={SRI_LANKA_DISTRICTS} onChange={setFDistrict} /></Field>
            <Field label="Members" required><Input value={fMembers} onChangeText={setFMembers} keyboardType="number-pad" placeholder="e.g., 12" /></Field>
            <Field label="Equipment"><Input value={fEquip} onChangeText={setFEquip} placeholder="e.g., 2 Vehicles, Medical Kit" /></Field>
            <Field label="Status"><Select value={fStatus} options={['Available', 'On Mission', 'Unavailable']} onChange={setFStatus} /></Field>
          </Col>
          <Col>
            <Field label="Base location" required hint="Click the map to pin the team's base."><Input icon="search" value={fSearch} onChangeText={setFSearch} placeholder="Search for a location…" onSubmitEditing={doSearch} /></Field>
            <WebMap height={300} pickable pick={fPick} onPick={(lat, lng) => setFPick({ lat, lng })} />
          </Col>
        </Row>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
          <Btn label="Cancel" variant="secondary" onPress={() => setFormOpen(false)} /><Btn label="Save Team" icon="save-outline" loading={busy} onPress={saveTeam} />
        </View>
      </FormModal>
    </View>
  );
}
const s = StyleSheet.create({ b: { fontSize: 13, fontWeight: '700', color: O.text }, t: { fontSize: 12, color: O.textMid } });
