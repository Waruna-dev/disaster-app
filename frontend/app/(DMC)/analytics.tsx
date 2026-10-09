import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { PieChart, ColumnChart, HBarChart } from '../../components/Charts';
import { Shelter, ShelterRequest } from '../../types/shelter';
import { RescueTeam, RescueRequest } from '../../types/rescueTeam';
import { Resource, ResourceDistribution } from '../../types/resource';
import { fetchAllShelters } from '../../services/shelterService';
import { fetchAllShelterRequests } from '../../services/shelterRequestService';
import { fetchAllRescueTeams } from '../../services/rescueTeamService';
import { fetchAllRescueRequests } from '../../services/rescueRequestService';
import { fetchAllResources, fetchDistributions } from '../../services/resourceService';
import { exportReportPdf, PdfReport } from '../../utils/reportPdf';

const count = <T,>(items: T[], key: (i: T) => string) =>
  items.reduce<Record<string, number>>((acc, i) => { const k = key(i); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
const toData = (m: Record<string, number>, colors?: Record<string, string>) =>
  Object.entries(m).map(([label, value]) => ({ label, value, color: colors?.[label] }));

const STATUS_COLORS: Record<string, string> = {
  Available: '#2E7D32', Limited: '#F9A825', Full: '#D32F2F', Closed: '#8A9C99',
  Pending: '#F9A825', Assigned: '#1D6FC4', Rejected: '#D32F2F', Completed: '#2E7D32',
  'On Mission': '#1D6FC4', Unavailable: '#8A9C99', 'On the way': '#1D6FC4', Pickup: '#7B3FA0',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <View>
      <View style={[styles.tr, styles.thRow]}>
        {headers.map((h) => <Text key={h} style={[styles.td, styles.th]}>{h}</Text>)}
      </View>
      {rows.length === 0 ? <Text style={styles.noData}>No data</Text> : rows.map((r, i) => (
        <View key={i} style={styles.tr}>
          {r.map((c, j) => <Text key={j} style={styles.td} numberOfLines={1}>{String(c)}</Text>)}
        </View>
      ))}
    </View>
  );
}

export default function DmcAnalyticsScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [shelterReqs, setShelterReqs] = useState<ShelterRequest[]>([]);
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [rescueReqs, setRescueReqs] = useState<RescueRequest[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [distributions, setDistributions] = useState<ResourceDistribution[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, sr, t, rr, r, d] = await Promise.all([
        fetchAllShelters(), fetchAllShelterRequests(), fetchAllRescueTeams(),
        fetchAllRescueRequests(), fetchAllResources(), fetchDistributions(),
      ]);
      setShelters(s); setShelterReqs(sr); setTeams(t); setRescueReqs(rr); setResources(r); setDistributions(d);
    } catch {
      Alert.alert('Error', 'Could not load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const a = useMemo(() => {
    const capacity = shelters.reduce((s, x) => s + x.capacity, 0);
    const occupancy = shelters.reduce((s, x) => s + x.currentOccupancy, 0);
    const occPct = capacity ? Math.round((occupancy / capacity) * 100) : 0;
    const shelterStatus = toData(count(shelters, (x) => x.status), STATUS_COLORS);
    const shelterReqStatus = toData(count(shelterReqs, (x) => x.status), STATUS_COLORS);
    const teamStatus = toData(count(teams, (x) => x.status), STATUS_COLORS);
    const rescueReqStatus = toData(count(rescueReqs, (x) => x.status), STATUS_COLORS);
    const rescueByType = toData(count(rescueReqs, (x) => x.requestedType));
    const occByDistrict = Object.entries(
      shelters.reduce<Record<string, number>>((acc, s) => { acc[s.district] = (acc[s.district] || 0) + s.currentOccupancy; return acc; }, {})
    ).map(([label, value]) => ({ label, value }));
    const distByResource = Object.entries(
      distributions.reduce<Record<string, number>>((acc, d) => { acc[d.resourceName] = (acc[d.resourceName] || 0) + d.quantity; return acc; }, {})
    ).map(([label, value]) => ({ label, value }));
    const distByDistrict = toData(count(distributions, (d) => d.district));

    const pendingShelter = shelterReqs.filter((r) => r.status === 'Pending').length;
    const pendingRescue = rescueReqs.filter((r) => r.status === 'Pending').length;
    const availableTeams = teams.filter((t) => t.status === 'Available').length;
    const lowStock = resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2);
    const nearFull = shelters.filter((s) => s.status === 'Full' || s.status === 'Limited');

    // Rule-based decision support — plain-language actions derived from the live numbers.
    const decisions: string[] = [];
    if (pendingRescue > availableTeams) decisions.push(`${pendingRescue} rescue requests are pending but only ${availableTeams} team(s) are available — mobilise additional teams or request mutual aid.`);
    else if (pendingRescue > 0) decisions.push(`${pendingRescue} rescue request(s) are waiting for assignment — assign available teams now.`);
    if (pendingShelter > 0) decisions.push(`${pendingShelter} shelter request(s) are pending — assign shelters with free capacity.`);
    if (nearFull.length > 0) decisions.push(`${nearFull.length} shelter(s) are Limited/Full (${nearFull.map((s) => s.name).slice(0, 3).join(', ')}) — open overflow shelters or redirect new arrivals.`);
    if (occPct >= 80) decisions.push(`Overall shelter occupancy is ${occPct}% — plan additional capacity.`);
    if (lowStock.length > 0) decisions.push(`Low stock (≤20%): ${lowStock.map((r) => r.name).join(', ')} — restock before further distribution.`);
    if (decisions.length === 0) decisions.push('No critical issues detected. Continue routine monitoring.');

    return { capacity, occupancy, occPct, shelterStatus, shelterReqStatus, teamStatus, rescueReqStatus, rescueByType,
      occByDistrict, distByResource, distByDistrict, pendingShelter, pendingRescue, availableTeams, lowStock, decisions };
  }, [shelters, shelterReqs, teams, rescueReqs, resources, distributions]);

  const handleExport = async () => {
    const report: PdfReport = {
      title: 'Smart Disaster Early-Warning System — Operations Report',
      generatedAt: new Date().toLocaleString(),
      summary: [
        { label: 'Shelters', value: String(shelters.length) },
        { label: 'Shelter Occupancy', value: `${a.occPct}%` },
        { label: 'Rescue Teams', value: String(teams.length) },
        { label: 'Pending Requests', value: String(a.pendingShelter + a.pendingRescue) },
        { label: 'Distributions', value: String(distributions.length) },
      ],
      sections: [
        { title: 'Shelters', headers: ['Name', 'District', 'Capacity', 'Occupancy', 'Status'],
          rows: shelters.map((s) => [s.name, s.district, s.capacity, s.currentOccupancy, s.status]) },
        { title: 'Shelter Occupancy by District', bars: a.occByDistrict },
        { title: 'Rescue Teams', headers: ['Name', 'Type', 'District', 'Members', 'Status'],
          rows: teams.map((t) => [t.name, t.type, t.district, t.members, t.status]) },
        { title: 'Rescue Requests by Type', bars: a.rescueByType },
        { title: 'Resource Stock', headers: ['Resource', 'Category', 'Available', 'Total', 'Unit'],
          rows: resources.map((r) => [r.name, r.category, r.availableQuantity, r.totalQuantity, r.unit]) },
        { title: 'Distribution History', headers: ['Date', 'Resource', 'Quantity', 'District'],
          rows: distributions.map((d) => [d.distributionDate, d.resourceName, `${d.quantity} ${d.unit}`, d.district]) },
        { title: 'Decisions & Recommended Actions', bullets: a.decisions },
      ],
    };
    try {
      setExporting(true);
      await exportReportPdf(report);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · REPORTS" title="Analytics & Reports" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.pdfBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="document-text" size={18} color={Colors.white} />}
            <Text style={styles.pdfBtnText}>{exporting ? 'Generating…' : 'Generate PDF Report'}</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <StatTile icon="home" value={String(shelters.length)} label="Shelters" tint="#1D6FC4" tintBg="#E3F0FC" compact />
            <StatTile icon="people" value={String(teams.length)} label="Rescue Teams" tint={Colors.primary} tintBg="#E8F5F2" compact />
            <StatTile icon="mail-unread" value={String(a.pendingShelter + a.pendingRescue)} label="Pending Requests" tint="#B8860B" tintBg="#FFF4DC" compact />
            <StatTile icon="send" value={String(distributions.length)} label="Distributions" tint="#7B3FA0" tintBg="#F1E7FB" compact />
          </View>

          <Card title="Decisions & Recommended Actions">
            {a.decisions.map((d, i) => (
              <View key={i} style={styles.decisionRow}>
                <Ionicons name="bulb-outline" size={16} color="#B8860B" />
                <Text style={styles.decisionText}>{d}</Text>
              </View>
            ))}
          </Card>

          <Card title="Shelter Status (Pie)"><PieChart data={a.shelterStatus} /></Card>
          <Card title="Shelter Occupancy by District (Column)"><ColumnChart data={a.occByDistrict} /></Card>
          <Card title="Rescue Team Status (Pie)"><PieChart data={a.teamStatus} /></Card>
          <Card title="Rescue Requests by Type (Bar)"><HBarChart data={a.rescueByType} /></Card>
          <Card title="Rescue Request Progress (Column)"><ColumnChart data={a.rescueReqStatus} /></Card>
          <Card title="Shelter Requests (Pie)"><PieChart data={a.shelterReqStatus} /></Card>
          <Card title="Resources Distributed by Item (Bar)"><HBarChart data={a.distByResource} /></Card>
          <Card title="Distributions per District (Column)"><ColumnChart data={a.distByDistrict} /></Card>

          <Card title="Shelters Table">
            <Table headers={['Name', 'District', 'Occ.', 'Status']} rows={shelters.map((s) => [s.name, s.district, `${s.currentOccupancy}/${s.capacity}`, s.status])} />
          </Card>
          <Card title="Rescue Teams Table">
            <Table headers={['Name', 'Type', 'Members', 'Status']} rows={teams.map((t) => [t.name, t.type, t.members, t.status])} />
          </Card>
          <Card title="Resource Stock Table">
            <Table headers={['Resource', 'Available', 'Total', 'Unit']} rows={resources.map((r) => [r.name, r.availableQuantity, r.totalQuantity, r.unit])} />
          </Card>
        </ScrollView>
      )}

      <DMCTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 110 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 16 },
  pdfBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF3F1' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  decisionRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  decisionText: { flex: 1, fontSize: 12, color: Colors.textMedium, lineHeight: 18 },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F5F4' },
  thRow: { backgroundColor: '#E8F5F2', borderRadius: 8, borderBottomWidth: 0 },
  td: { flex: 1, fontSize: 11, color: Colors.textMedium, paddingHorizontal: 6 },
  th: { fontWeight: '800', color: Colors.textDark },
  noData: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, paddingVertical: 12 },
});
