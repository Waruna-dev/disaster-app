import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useOfficerData } from '../../hooks/useOfficerData';
import { Badge, Btn, Card, Col, EmptyState, PageHeader, Row, Spinner, StatCard, StatGrid, Table, fmtDateTime } from '../../components/officer/ui';
import { WebMap } from '../../components/officer/WebMap';
import { O, RISK_COLOR } from '../../components/officer/theme';

const todayStr = () => new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });

export default function Dashboard() {
  const { userProfile, user } = useAuth();
  const d = useOfficerData();
  const name = (userProfile as any)?.fullName?.split(' ')[0] || 'District Officer';

  const activeWarnings = useMemo(() => d.warnings.filter((w) => w.status === 'Active'), [d.warnings]);
  const totalStock = d.resources.reduce((s, r) => s + r.availableQuantity, 0);

  const tasks = useMemo(() => {
    const t: { id: string; task: string; priority: 'High' | 'Medium'; href: string }[] = [];
    d.shelterRequests.filter((r) => r.status === 'Pending').slice(0, 3).forEach((r) =>
      t.push({ id: 'sr' + r.id, task: `Assign shelter — ${r.userName || 'Resident'} (${r.peopleCount} ppl)`, priority: 'High', href: '/officer/shelter-requests' }));
    d.rescueRequests.filter((r) => r.status === 'Pending').slice(0, 3).forEach((r) =>
      t.push({ id: 'rr' + r.id, task: `Assign rescue team — ${r.requestedType}`, priority: 'High', href: '/officer/rescue-requests' }));
    d.shelters.filter((s) => s.status === 'Full' || s.status === 'Limited').slice(0, 2).forEach((s) =>
      t.push({ id: 'sh' + s.id, task: `Review shelter occupancy — ${s.name}`, priority: 'Medium', href: '/officer/shelters' }));
    d.resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2).slice(0, 2).forEach((r) =>
      t.push({ id: 'rs' + r.id, task: `Restock / confirm dispatch — ${r.name}`, priority: 'Medium', href: '/officer/resources' }));
    return t.slice(0, 6);
  }, [d.shelterRequests, d.rescueRequests, d.shelters, d.resources]);

  if (d.loading) return <Spinner label="Loading dashboard…" />;

  return (
    <View>
      <PageHeader title={`Welcome, ${name}`} subtitle="Coordinate resources and support disaster response."
        actions={<Btn label="Refresh" icon="refresh" variant="secondary" onPress={d.refresh} />} />

      <StatGrid>
        <StatCard icon="business" label="Total Shelters" value={d.shelters.length} tone="primary" onPress={() => router.push('/officer/shelters' as any)} />
        <StatCard icon="people" label="Rescue Teams" value={d.teams.length} tone="info" onPress={() => router.push('/officer/rescue-teams' as any)} />
        <StatCard icon="cube" label="Relief Resources" value={totalStock.toLocaleString()} tone="purple" hint="units available" onPress={() => router.push('/officer/resources' as any)} />
        <StatCard icon="warning" label="Active Alerts" value={activeWarnings.length} tone="danger" onPress={() => router.push('/officer/hazard-alerts' as any)} />
      </StatGrid>

      <Row>
        <Col flex={1}>
          <Card title="Affected Areas" subtitle="Active hazard warnings on the map">
            <WebMap height={300}
              markers={activeWarnings.map((w) => ({ id: w.id, lat: w.latitude, lng: w.longitude, label: w.title, sub: w.affectedArea, color: RISK_COLOR[w.riskLevel] }))}
              circles={activeWarnings.map((w) => ({ lat: w.latitude, lng: w.longitude, radius: w.radius, color: RISK_COLOR[w.riskLevel] }))} />
            <View style={s.legend}>
              {[['Critical / High', RISK_COLOR.HIGH], ['Medium', RISK_COLOR.MEDIUM], ['Low', RISK_COLOR.LOW]].map(([l, c]) => (
                <View key={l} style={s.legendItem}><View style={[s.dot, { backgroundColor: c }]} /><Text style={s.legendText}>{l}</Text></View>
              ))}
            </View>
          </Card>
        </Col>
        <Col flex={1}>
          <Card title="Recent Alerts" action={<Btn small variant="ghost" label="View All" onPress={() => router.push('/officer/hazard-alerts' as any)} />}>
            {d.warnings.length === 0 ? <EmptyState icon="notifications-off-outline" text="No hazard alerts yet." /> :
              d.warnings.slice(0, 4).map((w) => (
                <TouchableOpacity key={w.id} style={s.alertRow} onPress={() => router.push('/officer/hazard-alerts' as any)}>
                  <View style={[s.alertIcon, { backgroundColor: RISK_COLOR[w.riskLevel] + '22' }]}>
                    <Ionicons name={w.hazardType === 'flood' ? 'water' : 'triangle'} size={20} color={RISK_COLOR[w.riskLevel]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertTitle} numberOfLines={1}>{w.title}</Text>
                    <Text style={s.alertSub} numberOfLines={1}>{w.affectedArea}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge text={w.riskLevel} />
                    <Text style={s.alertSub}>{fmtDateTime(w.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </Card>
        </Col>
      </Row>

      <Row>
        <Col flex={1}>
          <Card title="Ongoing Response Activities" action={<Btn small variant="ghost" label="View All" onPress={() => router.push('/officer/summary' as any)} />}>
            <Table minWidth={420} rows={d.activities.slice(0, 5)} empty="No activities recorded yet."
              columns={[
                { key: 'title', title: 'Activity', flex: 1.4 },
                { key: 'location', title: 'Location', flex: 1, render: (r) => <Text style={s.td}>{r.location || '—'}</Text> },
                { key: 'status', title: 'Status', flex: 1, render: (r) => <Badge text={r.status} /> },
              ]} />
          </Card>
        </Col>
        <Col flex={1}>
          <Card title="My Tasks" subtitle="Generated from live requests and stock levels">
            <Table minWidth={420} rows={tasks} empty="Nothing needs your attention right now."
              onRowPress={(r) => router.push(r.href as any)}
              columns={[
                { key: 'task', title: 'Task', flex: 2 },
                { key: 'priority', title: 'Priority', flex: 0.8, render: (r) => <Badge text={r.priority} /> },
                { key: 'due', title: 'Due', flex: 1, render: () => <Text style={s.td}>{todayStr()}</Text> },
              ]} />
          </Card>
        </Col>
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 18, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { fontSize: 12, color: O.textMid, fontWeight: '600' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F5F3' },
  alertIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: O.text },
  alertSub: { fontSize: 11, color: O.textMuted, marginTop: 2 },
  td: { fontSize: 13, color: O.text },
});
