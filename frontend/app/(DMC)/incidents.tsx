import React, { useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { ReportReviewCard } from '../../components/ReportReviewCard';
import { ReportListItem } from '../../components/ReportListItem';
import { ApproveConfirmDialog } from '../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../components/RejectReasonDialog';
import { useReports } from '../../hooks/useReports';
import { Report, DisasterType } from '../../types/report';

type TypeFilter = 'all' | DisasterType;
type ViewMode = 'cards' | 'list';

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flood', label: 'Flood' },
  { key: 'landslide', label: 'Landslide' },
];

// Reviews individual resident-submitted reports (the real `reports` collection) —
// there's no grouping pipeline turning them into a separate "incidents" collection,
// so each card here is one report, not a cluster of them.
export default function AdminReportApprovalScreen() {
  const { reports, loading } = useReports('Pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [approveTarget, setApproveTarget] = useState<Report | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);
  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const visible = useMemo(
    () => (typeFilter === 'all' ? reports : reports.filter((r) => r.disasterType === typeFilter)),
    [reports, typeFilter]
  );

  // Derived from the same `reports` array the list renders, so the banner and the
  // cards underneath it can never disagree.
  const pendingCount = reports.length;
  const floodCount = reports.filter((r) => r.disasterType === 'flood').length;
  const landslideCount = reports.filter((r) => r.disasterType === 'landslide').length;

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DMC · APPROVAL SCREEN" title="Pending Reports" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      <Animated.FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <View style={styles.statsGrid}>
              <StatTile icon="time-outline" value={String(pendingCount)} label="Pending" tint="#D68910" tintBg="#FEF5E7" compact />
              <StatTile icon="water-outline" value={String(floodCount)} label="Flood" tint="#2E75D6" tintBg="#E8F1FB" compact />
              <StatTile icon="triangle-outline" value={String(landslideCount)} label="Landslide" tint="#8A5A2B" tintBg="#F1EBE3" compact />
            </View>

            <TouchableOpacity
              style={styles.groupedLink}
              activeOpacity={0.7}
              onPress={() => router.push('/(DMC)/report-groups' as any)}
            >
              <Ionicons name="git-network-outline" size={16} color={Colors.primary} />
              <Text style={styles.groupedLinkText}>View grouped incidents</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupedLink, styles.floodZonesLink]}
              activeOpacity={0.7}
              onPress={() => router.push('/(DMC)/flood-incidents' as any)}
            >
              <Ionicons name="water-outline" size={16} color="#2E75D6" />
              <Text style={[styles.groupedLinkText, styles.floodZonesLinkText]}>View flood affected areas</Text>
              <Ionicons name="chevron-forward" size={16} color="#2E75D6" />
            </TouchableOpacity>

            <View style={styles.filterRow}>
              <View style={styles.filterTabs}>
                {TYPE_FILTERS.map((filter) => {
                  const isActive = filter.key === typeFilter;
                  return (
                    <TouchableOpacity key={filter.key} style={styles.filterTab} activeOpacity={0.7} onPress={() => setTypeFilter(filter.key)}>
                      <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{filter.label}</Text>
                      {isActive && <View style={styles.filterUnderline} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === 'cards' && styles.viewToggleBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setViewMode('cards')}
                >
                  <Ionicons name="albums-outline" size={16} color={viewMode === 'cards' ? Colors.white : Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons name="list" size={16} color={viewMode === 'list' ? Colors.white : Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) =>
          viewMode === 'list' ? (
            <ReportListItem report={item} onPress={() => router.push(`/(DMC)/incident/${item.id}` as any)} />
          ) : (
            <ReportReviewCard
              report={item}
              onViewDetails={() => router.push(`/(DMC)/incident/${item.id}` as any)}
              onApprove={() => setApproveTarget(item)}
              onReject={() => setRejectTarget(item)}
            />
          )
        }
        ListEmptyComponent={
          loading ? (
            <View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No pending reports — you're caught up</Text>
            </View>
          )
        }
      />

      <DMCTabBar active="incidents" />

      <ApproveConfirmDialog
        visible={approveTarget !== null}
        reports={approveTarget ? [approveTarget] : []}
        onClose={() => setApproveTarget(null)}
        onApproved={() => setApproveTarget(null)}
      />
      <RejectReasonDialog
        visible={rejectTarget !== null}
        reports={rejectTarget ? [rejectTarget] : []}
        onClose={() => setRejectTarget(null)}
        onRejected={() => setRejectTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  groupedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5F2',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  groupedLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  floodZonesLink: {
    backgroundColor: '#E8F1FB',
  },
  floodZonesLinkText: {
    color: '#2E75D6',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F0EC',
  },
  filterTabs: {
    flexDirection: 'row',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#EFF4F3',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  viewToggleBtn: {
    width: 30,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterTab: {
    marginRight: 24,
    paddingBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  filterUnderline: {
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: 8,
    borderRadius: 1,
  },
  skeletonCard: {
    height: 220,
    borderRadius: 20,
    backgroundColor: '#E3EFEC',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
});
