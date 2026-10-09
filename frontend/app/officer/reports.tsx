import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfficerData } from '../../hooks/useOfficerData';
import { Badge, Btn, Card, Col, PageHeader, Row, Select, Spinner, StatCard, StatGrid, Table, useUI } from '../../components/officer/ui';
import { PieChart, ColumnChart, HBarChart } from '../../components/Charts';
import { exportReportPdf, PdfReport } from '../../utils/reportPdf';
import { O } from '../../components/officer/theme';

const PERIODS: Record<string, number> = { 'All time': 0, 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 };
const SC: Record<string, string> = { Available: '#2E7D32', Limited: '#F9A825', Full: '#D32F2F', Closed: '#8A9C99', Pending: '#F9A825', Assigned: '#1D6FC4', Rejected: '#D32F2F',
  Completed: '#2E7D32', 'On Mission': '#1D6FC4', Unavailable: '#8A9C99', 'On the way': '#1D6FC4', Pickup: '#7B3FA0' };
const tally = <T,>(a: T[], k: (x: T) => string, colors = false) => {
  const m: Record<string, number> = {}; a.forEach((x) => { const key = k(x); m[key] = (m[key] || 0) + 1; });
  return Object.entries(m).map(([label, value]) => ({ label, value, color: colors ? SC[label] : undefined }));
};

export default function Reports() {
  const d = useOfficerData();
  const { toast } = useUI();
  const [period, setPeriod] = useState('All time');
  const [busy, setBusy] = useState(false);

  const a = useMemo(() => {
    const days = PERIODS[period]; const since = days ? Date.now() - days * 86400000 : 0;
    const inP = (ts: any) => !since || (ts?.toMillis?.() ?? 0) >= since;
    const sReq = d.shelterRequests.filter((r) => inP(r.createdAt)); const rReq = d.rescueRequests.filter((r) => inP(r.createdAt));
    const dist = d.distributions.filter((x) => inP(x.createdAt));
    const cap = d.shelters.reduce((s, x) => s + x.capacity, 0); const occ = d.shelters.reduce((s, x) => s + x.currentOccupancy, 0);
    const occPct = cap ? Math.round((occ / cap) * 100) : 0;
    const sum = (arr: { label: string; v: number }[]) => Object.entries(arr.reduce<Record<string, number>>((m, x) => { m[x.label] = (m[x.label] || 0) + x.v; return m; }, {})).map(([label, value]) => ({ label, value }));
    const occByDistrict = sum(d.shelters.map((s) => ({ label: s.district, v: s.currentOccupancy })));
    const distByItem = sum(dist.map((x) => ({ label: x.resourceName, v: x.quantity })));
    const pendS = sReq.filter((r) => r.status === 'Pending').length; const pendR = rReq.filter((r) => r.status === 'Pending').length;
    const availTeams = d.teams.filter((t) => t.status === 'Available').length;
    const low = d.resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2);
    const tight = d.shelters.filter((s) => s.status === 'Full' || s.status === 'Limited');
    const done = rReq.filter((r) => r.status === 'Completed').length;
    const decisions: string[] = [];
    if (pendR > availTeams) decisions.push(`${pendR} rescue requests are pending but only ${availTeams} team(s) are available — mobilise additional teams or request mutual aid.`);
    else if (pendR > 0) decisions.push(`${pendR} rescue request(s) are waiting — assign available teams now.`);
    if (pendS > 0) decisions.push(`${pendS} shelter request(s) are pending — assign shelters with free capacity.`);
    if (tight.length) decisions.push(`${tight.length} shelter(s) are Limited/Full (${tight.slice(0, 3).map((s) => s.name).join(', ')}) — open overflow shelters or redirect new arrivals.`);
    if (occPct >= 80) decisions.push(`Overall shelter occupancy is ${occPct}% — plan additional capacity.`);
    if (low.length) decisions.push(`Low stock (≤20%): ${low.map((r) => r.name).join(', ')} — restock before further distribution.`);
    if (!decisions.length) decisions.push('No critical issues detected. Continue routine monitoring.');
    return { sReq, rReq, dist, cap, occ, occPct, occByDistrict, distByItem, pendS, pendR, availTeams, decisions, done,
      shelterStatus: tally(d.shelters, (x) => x.status, true), teamStatus: tally(d.teams, (x) => x.status, true),
      rescueStatus: tally(rReq, (x) => x.status, true), shelterReqStatus: tally(sReq, (x) => x.status, true), rescueType: tally(rReq, (x) => x.requestedType),
      distDistrict: tally(dist, (x) => x.district) };
  }, [d, period]);

  const exportPdf = async () => {
    const report: PdfReport = {
      title: 'Smart Disaster Early-Warning System — Operations Report', generatedAt: `${new Date().toLocaleString()} · ${period}`,
      summary: [{ label: 'Shelters', value: String(d.shelters.length) }, { label: 'Shelter Occupancy', value: `${a.occPct}%` }, { label: 'Rescue Teams', value: String(d.teams.length) },
        { label: 'Pending Requests', value: String(a.pendS + a.pendR) }, { label: 'Distributions', value: String(a.dist.length) }],
      sections: [
        { title: 'Decisions & Recommended Actions', bullets: a.decisions },
        { title: 'Shelters', headers: ['Name', 'District', 'Capacity', 'Occupancy', 'Status'], rows: d.shelters.map((s) => [s.name, s.district, s.capacity, s.currentOccupancy, s.status]) },
        { title: 'Shelter Occupancy by District', bars: a.occByDistrict },
        { title: 'Rescue Teams', headers: ['Name', 'Type', 'District', 'Members', 'Status'], rows: d.teams.map((t) => [t.name, t.type, t.district, t.members, t.status]) },
        { title: 'Rescue Requests by Type', bars: a.rescueType.map(({ label, value }) => ({ label, value })) },
        { title: 'Resource Stock', headers: ['Resource', 'Category', 'Available', 'Total', 'Unit'], rows: d.resources.map((r) => [r.name, r.category, r.availableQuantity, r.totalQuantity, r.unit]) },
        { title: 'Distribution History', headers: ['Date', 'Resource', 'Quantity', 'District'], rows: a.dist.map((x) => [x.distributionDate, x.resourceName, `${x.quantity} ${x.unit}`, x.district]) },
      ],
    };
    try { setBusy(true); await exportReportPdf(report); toast('Report ready — choose "Save as PDF" in the print dialog.', 'info'); }
    catch (e: any) { toast(e?.message || 'Could not generate PDF', 'error'); } finally { setBusy(false); }
  };

  if (d.loading) return <Spinner label="Building reports…" />;

  return (
    <View>
      <PageHeader title="Reports & Analytics" subtitle="Operational overview with charts, tables and recommended decisions."
        actions={<><View style={{ width: 170 }}><Select value={period} options={Object.keys(PERIODS)} onChange={setPeriod} /></View>
          <Btn label="Generate PDF Report" icon="document-text" loading={busy} onPress={exportPdf} /></>} />
      <StatGrid>
        <StatCard icon="business" label="Shelter Occupancy" value={`${a.occPct}%`} hint={`${a.occ.toLocaleString()} of ${a.cap.toLocaleString()} beds`} tone="primary" />
        <StatCard icon="people" label="Teams Available" value={`${a.availTeams}/${d.teams.length}`} tone="info" />
        <StatCard icon="mail-unread" label="Pending Requests" value={a.pendS + a.pendR} tone="warning" />
        <StatCard icon="checkmark-done" label="Rescues Completed" value={a.done} tone="success" />
      </StatGrid>

      <Card title="Decisions & Recommended Actions" subtitle="Generated from live numbers">
        {a.decisions.map((x, i) => <View key={i} style={s.dec}><Ionicons name="bulb-outline" size={18} color="#B7791F" /><Text style={s.decT}>{x}</Text></View>)}
      </Card>

      <Row>
        <Col><Card title="Shelter Status (Pie)"><PieChart data={a.shelterStatus} /></Card></Col>
        <Col><Card title="Rescue Team Status (Pie)"><PieChart data={a.teamStatus} /></Card></Col>
        <Col><Card title="Shelter Requests (Pie)"><PieChart data={a.shelterReqStatus} /></Card></Col>
      </Row>
      <Row>
        <Col><Card title="Shelter Occupancy by District (Column)"><ColumnChart data={a.occByDistrict} width={420} /></Card></Col>
        <Col><Card title="Rescue Request Progress (Column)"><ColumnChart data={a.rescueStatus} width={420} /></Card></Col>
      </Row>
      <Row>
        <Col><Card title="Rescue Requests by Type (Bar)"><HBarChart data={a.rescueType} /></Card></Col>
        <Col><Card title="Resources Distributed by Item (Bar)"><HBarChart data={a.distByItem} /></Card></Col>
        <Col><Card title="Distributions per District (Bar)"><HBarChart data={a.distDistrict} /></Card></Col>
      </Row>

      <Card title="Shelters"><Table rows={d.shelters} minWidth={560} columns={[{ key: 'name', title: 'Name', flex: 1.5 }, { key: 'district', title: 'District', flex: 1 },
        { key: 'o', title: 'Occupancy', flex: 1, render: (x) => <Text style={s.t}>{x.currentOccupancy}/{x.capacity}</Text> }, { key: 'st', title: 'Status', flex: 0.8, render: (x) => <Badge text={x.status} /> }]} /></Card>
      <Card title="Rescue Teams"><Table rows={d.teams} minWidth={560} columns={[{ key: 'name', title: 'Name', flex: 1.4 }, { key: 'type', title: 'Type', flex: 1.1 }, { key: 'district', title: 'District', flex: 1 },
        { key: 'members', title: 'Members', flex: 0.7 }, { key: 'st', title: 'Status', flex: 0.8, render: (x) => <Badge text={x.status} /> }]} /></Card>
      <Card title="Resource Stock"><Table rows={d.resources} minWidth={560} columns={[{ key: 'name', title: 'Resource', flex: 1.3 }, { key: 'category', title: 'Category', flex: 1 },
        { key: 'availableQuantity', title: 'Available', flex: 0.8 }, { key: 'totalQuantity', title: 'Total', flex: 0.8 }, { key: 'unit', title: 'Unit', flex: 0.7 }]} /></Card>
    </View>
  );
}
const s = StyleSheet.create({ dec: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }, decT: { flex: 1, fontSize: 13, color: O.textMid, lineHeight: 19 }, t: { fontSize: 12, color: O.textMid } });
