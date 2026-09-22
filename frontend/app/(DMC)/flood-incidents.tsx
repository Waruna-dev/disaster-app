import React, { useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { useFloodIncidents, FloodIncidentWithReview } from '../../hooks/useFloodIncidents';
import { IncidentReviewStatus } from '../../types/floodIncident';
import { RiskLevel } from '../../types/alert';

type StatusFilter = 'all' | IncidentReviewStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
];

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string }> = {
  LOW: { color: '#2E75D6', bg: '#E8F1FB' },
  MEDIUM: { color: '#B7860B', bg: '#FEF9E7' },
  HIGH: { color: Colors.warning, bg: '#FEF5E7' },
  CRITICAL: { color: Colors.danger, bg: '#FDEDEC' },
};

const REVIEW_STATUS_CONFIG: Record<IncidentReviewStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending: { color: '#D68910', bg: '#FEF5E7', icon: 'time-outline' },
  Approved: { color: Colors.primary, bg: '#E8F5F2', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.danger, bg: '#FDEDEC', icon: 'close-circle-outline' },
};

// Verified flood reports -> automatic 300m clustering (utils/floodIncidents.ts) ->
// one card per detected affected area, pending the officer's approve/reject on the
// generated polygon before it can back a public warning. Distinct from
// report-groups.tsx, which clusters *Pending* reports pre-approval at a 3km radius
// for review convenience — this screen only ever looks at already-Verified flood
// reports and exists to turn them into a mapped, officer-approved affected zone.
export default function FloodIncidentsScreen() {
  const { incidents, loading } = useFloodIncidents();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const visible = useMemo(
    () => (statusFilter === 'all' ? incidents : incidents.filter((i) => i.reviewStatus === statusFilter)),
    [incidents, statusFilter]
  );

  const pendingCount = incidents.filter((i) => i.reviewStatus === 'Pending').length;
  const approvedCount = incidents.filter((i) => i.reviewStatus === 'Approved').length;

  return (
    <View style={styles.container}>
      <DMCNavHeader
        eyebrow="DMC · FLOOD ZONES"
        title="Flood Affected Areas"
        scrollY={scrollY}
        onBack={() => router.push('/(DMC)/incidents' as any)}
      />

      <Animated.FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <View style={styles.statsGrid}>
              <StatTile icon="water-outline" value={String(incidents.length)} label="Detected" tint="#2E75D6" tintBg="#E8F1FB" compact />
              <StatTile icon="time-outline" value={String(pendingCount)} label="Pending" tint="#D68910" tintBg="#FEF5E7" compact />
              <StatTile icon="checkmark-circle-outline" value={String(approvedCount)} label="Approved" tint={Colors.primary} tintBg="#E8F5F2" compact />
            </View>

            <Text style={styles.flowHint}>
              Auto-generated from verified flood reports within 300m of each other. Review each affected-area polygon before it's used for a public warning.
            </Text>

            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((filter) => {
                const isActive = filter.key === statusFilter;
                return (
                  <TouchableOpacity key={filter.key} style={styles.filterTab} activeOpacity={0.7} onPress={() => setStatusFilter(filter.key)}>
                    <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{filter.label}</Text>
                    {isActive && <View style={styles.filterUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => <FloodIncidentCard incident={item} onView={() => router.push(`/(DMC)/flood-incident/${item.id}` as any)} />}
        ListEmptyComponent={
          loading ? (
            <View>
              {[0, 1].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={40} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No flood-affected areas detected</Text>
              <Text style={styles.emptySub}>
                {statusFilter === 'all'
                  ? 'Once 2 or more verified flood reports land within 300m of each other, an affected area appears here automatically.'
                  : `No incidents are currently ${statusFilter.toLowerCase()}.`}
              </Text>
            </View>
          )
        }
      />

      <DMCTabBar active="incidents" />
    </View>
  );
}

function FloodIncidentCard({ incident, onView }: { incident: FloodIncidentWithReview; onView: () => void }) {
  const risk = RISK_CONFIG[incident.riskLevel];
  const review = REVIEW_STATUS_CONFIG[incident.reviewStatus];
  const generatedAt = incident.generatedAt?.toDate().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{incident.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: review.bg }]}>
          <Ionicons name={review.icon} size={12} color={review.color} />
          <Text style={[styles.statusBadgeText, { color: review.color }]}>{incident.reviewStatus}</Text>
        </View>
      </View>

      <View style={styles.typeRow}>
        <View style={[styles.typeIcon, { backgroundColor: '#E8F1FB' }]}>
          <Ionicons name="water" size={18} color="#2E75D6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.areaText}>{incident.affectedArea}</Text>
          <Text style={styles.metaText}>{incident.reports.length} reports grouped{generatedAt ? ` · ${generatedAt}` : ''}</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
          <Text style={[styles.riskBadgeText, { color: risk.color }]}>{incident.riskLevel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.viewButton} activeOpacity={0.8} onPress={onView}>
        <Text style={styles.viewButtonText}>View Incident</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
  flowHint: { fontSize: 12, color: Colors.textLight, marginBottom: 16, lineHeight: 17 },
  filterRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E3F0EC' },
  filterTab: { marginRight: 24, paddingBottom: 10 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  filterLabelActive: { color: Colors.primary, fontWeight: '700' },
  filterUnderline: { height: 2, backgroundColor: Colors.primary, marginTop: 8, borderRadius: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  areaText: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  metaText: { fontSize: 12, color: Colors.textLight },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  riskBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: '#F0F5F4', marginBottom: 12 },
  viewButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewButtonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  skeletonCard: { height: 180, borderRadius: 20, backgroundColor: '#E3EFEC', marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textDark, textAlign: 'center' },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
