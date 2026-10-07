import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { RescueRequest, RescueRequestStatus, RescueTeam } from '../../types/rescueTeam';
import { fetchAllRescueRequests, assignTeamToRequest, updateRescueRequestStatus } from '../../services/rescueRequestService';
import { fetchAllRescueTeams, updateRescueTeam } from '../../services/rescueTeamService';
import { logActivity } from '../../services/activityService';
import { Badge, Btn, Card, Col, EmptyState, Field, Input, KV, PageHeader, Row, Spinner, Table, Tabs, TextArea, fmtDateTime, useUI } from '../../components/officer/ui';
import { WebMap } from '../../components/officer/WebMap';
import { O } from '../../components/officer/theme';

const NEXT: Partial<Record<RescueRequestStatus, RescueRequestStatus>> = { Assigned: 'On the way', 'On the way': 'Pickup', Pickup: 'Completed' };
const STEPS: RescueRequestStatus[] = ['Pending', 'Assigned', 'On the way', 'Pickup', 'Completed'];

export default function RescueRequests() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [reqs, setReqs] = useState<RescueRequest[]>([]);
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Pending');
  const [sel, setSel] = useState<RescueRequest | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([fetchAllRescueRequests(), fetchAllRescueTeams()]);
    setReqs(r); setTeams(t); setSel((c) => (c ? r.find((x) => x.id === c.id) ?? null : null)); setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  useEffect(() => { setTeamId(null); setTeamSearch(''); setNotes(''); }, [sel?.id]);

  const rows = useMemo(() => {
    if (tab === 'Active') return reqs.filter((r) => ['Assigned', 'On the way', 'Pickup'].includes(r.status));
    if (tab === 'Closed') return reqs.filter((r) => r.status === 'Completed' || r.status === 'Rejected');
    if (tab === 'All') return reqs;
    return reqs.filter((r) => r.status === 'Pending');
  }, [reqs, tab]);

  const options = useMemo(() => {
    if (!sel?.district) return [] as RescueTeam[];
    return teams
      .filter((t) => t.status === 'Available' && t.district === sel.district && t.type === sel.requestedType)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sel, teams]);
  const labelOf = (t: RescueTeam) => `${t.name} — ${t.type}, ${t.district} (${t.members} members)`;
  const matchingTeams = useMemo(() => {
    const search = teamSearch.trim().toLowerCase();
    return options.filter((team) => !search || labelOf(team).toLowerCase().includes(search)).slice(0, 6);
  }, [options, teamSearch]);

  const assign = async () => {
    const team = options.find((t) => t.id === teamId);
    if (!sel || !team) { toast('Select a team to assign.', 'error'); return; }
    try {
      setBusy(true);
      await assignTeamToRequest(sel.id, team.id, team.name, notes.trim() || undefined);
      await updateRescueTeam(team.id, { status: 'On Mission' });
      await logActivity({ type: 'rescue', title: 'Rescue team dispatched', detail: `${team.name} → ${sel.address}`, location: sel.district, status: 'In Progress', createdBy: user?.uid });
      toast('Team assigned. The citizen can now track progress.'); load();
    } catch (e: any) { toast(e?.message || 'Could not assign', 'error'); } finally { setBusy(false); }
  };
  const advance = async () => {
    if (!sel) return; const next = NEXT[sel.status]; if (!next) return;
    await updateRescueRequestStatus(sel.id, next);
    if (next === 'Completed' && sel.teamId) {
      await updateRescueTeam(sel.teamId, { status: 'Available' });
      await logActivity({ type: 'rescue', title: 'Rescue request completed', detail: `${sel.teamName} — ${sel.address}`, location: sel.district, status: 'Completed', createdBy: user?.uid });
    }
    toast(`Status updated to "${next}".`); load();
  };
  const reject = async () => {
    if (!sel) return;
    if (!(await confirm({ title: 'Reject request', message: 'Reject this rescue request?', confirmLabel: 'Reject', danger: true }))) return;
    await updateRescueRequestStatus(sel.id, 'Rejected', notes.trim() || undefined); toast('Request rejected.'); load();
  };

  if (loading) return <Spinner />;
  const count = (f: (r: RescueRequest) => boolean) => reqs.filter(f).length;

  return (
    <View>
      <PageHeader title="Citizen Rescue Requests" subtitle="Assign teams and track each rescue from dispatch to completion."
        actions={<Btn label="Back to Rescue Teams" icon="arrow-back" variant="secondary" onPress={() => router.push('/officer/rescue-teams' as any)} />} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'Pending', label: 'Pending', count: count((r) => r.status === 'Pending') },
        { key: 'Active', label: 'Active', count: count((r) => ['Assigned', 'On the way', 'Pickup'].includes(r.status)) },
        { key: 'Closed', label: 'Completed / Rejected' }, { key: 'All', label: 'All' }]} />
      <Row>
        <Col flex={1.5}>
          <Card padded={false}><View style={{ padding: 12 }}>
            <Table rows={rows} selectedId={sel?.id} onRowPress={setSel} minWidth={640} empty="No requests in this category."
              columns={[
                { key: 'userName', title: 'Citizen', flex: 1, render: (r) => <Text style={s.b}>{r.userName || 'Resident'}</Text> },
                { key: 'requestedType', title: 'Type', flex: 1 }, { key: 'peopleCount', title: 'People', flex: 0.6 },
                { key: 'status', title: 'Status', flex: 0.9, render: (r) => <Badge text={r.status} /> },
                { key: 'createdAt', title: 'Requested', flex: 1, render: (r) => <Text style={s.t}>{fmtDateTime(r.createdAt)}</Text> },
              ]} />
          </View></Card>
        </Col>
        <Col flex={1}>
          <Card title="Request details">
            {!sel ? <EmptyState icon="people-outline" text="Select a request to review." /> : (
              <>
                <WebMap height={180} zoom={14} center={{ lat: sel.latitude, lng: sel.longitude }}
                  markers={[{ id: 'req', lat: sel.latitude, lng: sel.longitude, label: 'Citizen location', color: O.danger }]} />
                <View style={s.steps}>
                  {STEPS.map((st, i) => { const done = sel.status !== 'Rejected' && i <= STEPS.indexOf(sel.status);
                    return <View key={st} style={s.step}><View style={[s.dot, done && s.dotOn]} /><Text style={[s.stepT, done && { color: O.primary, fontWeight: '800' }]}>{st}</Text></View>; })}
                </View>
                <KV label="Citizen">{sel.userName || 'Resident'}</KV><KV label="Contact">{sel.contactNumber}</KV>
                <KV label="Support type">{sel.requestedType}</KV><KV label="People">{String(sel.peopleCount)}</KV>
                <KV label="Address">{sel.address}</KV><KV label="Status"><Badge text={sel.status} /></KV>
                <KV label="Citizen selected team">{sel.preferredTeamName || 'No team selected'}</KV>
                {sel.teamName ? <KV label="Team">{sel.teamName}</KV> : null}
                {sel.status === 'Pending' && (
                  <View style={{ marginTop: 14 }}>
                    <Field
                      label="Assign team"
                      hint={options.length ? `Available ${sel.requestedType} teams in ${sel.district}.` : `No available ${sel.requestedType} teams in ${sel.district || 'the citizen district'}.`}
                    >
                      <Input
                        icon="search"
                        value={teamSearch}
                        onChangeText={(text) => { setTeamSearch(text); setTeamId(null); }}
                        placeholder={options.length ? 'Type a rescue team name' : 'No available teams found'}
                        editable={options.length > 0}
                      />
                      {!teamId && matchingTeams.length > 0 ? (
                        <View style={s.autocompleteList}>
                          {matchingTeams.map((team) => (
                            <TouchableOpacity key={team.id} style={s.autocompleteOption} onPress={() => { setTeamId(team.id); setTeamSearch(labelOf(team)); }}>
                              <Text style={s.autocompleteName}>{team.name}</Text>
                              <Text style={s.autocompleteMeta}>{team.type} · {team.district} · {team.members} members</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </Field>
                    <Field label="Note to citizen (optional)"><TextArea value={notes} onChangeText={setNotes} placeholder="e.g., Team will arrive in 20 minutes." /></Field>
                    <View style={{ flexDirection: 'row', gap: 10 }}><Btn label="Assign Team" icon="checkmark" loading={busy} onPress={assign} /><Btn label="Reject" variant="danger" onPress={reject} /></View>
                  </View>
                )}
                {NEXT[sel.status] && <Btn label={`Mark as "${NEXT[sel.status]}"`} icon="arrow-forward" style={{ marginTop: 14 }} onPress={advance} />}
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
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 }, step: { alignItems: 'center', flex: 1, gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D5E0DD' }, dotOn: { backgroundColor: O.primary }, stepT: { fontSize: 9, color: O.textMuted, textAlign: 'center' },
  autocompleteList: { borderWidth: 1, borderColor: O.border, borderRadius: 10, backgroundColor: '#fff', marginTop: 6, overflow: 'hidden' },
  autocompleteOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: O.border },
  autocompleteName: { fontSize: 14, fontWeight: '700', color: O.text },
  autocompleteMeta: { fontSize: 12, color: O.textMuted, marginTop: 3 },
});
