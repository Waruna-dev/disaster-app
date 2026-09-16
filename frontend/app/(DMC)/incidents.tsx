import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCHeader } from '../../components/DMCHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { ReportReviewCard } from '../../components/ReportReviewCard';
import { ApproveConfirmDialog } from '../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../components/RejectReasonDialog';
import { useReports } from '../../hooks/useReports';
import { Report, DisasterType } from '../../types/report';

type TypeFilter = 'all' | DisasterType;

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
  const [approveTarget, setApproveTarget] = useState<Report | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);

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
      <DMCHeader
        eyebrow="DMC · APPROVAL SCREEN"
        title="Pending Reports"
        onRightPress={() => router.push('/(DMC)/dashboard' as any)}
      />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.summaryBanner}>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryValue}>{pendingCount}</Text>
                <Text style={styles.summaryLabel}>PENDING</Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryValue}>{floodCount}</Text>
                <Text style={styles.summaryLabel}>FLOOD</Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text style={styles.summaryValue}>{landslideCount}</Text>
                <Text style={styles.summaryLabel}>LANDSLIDE</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
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
          </>
        }
        renderItem={({ item }) => (
          <ReportReviewCard
            report={item}
            onViewDetails={() => router.push(`/(DMC)/incident/${item.id}` as any)}
            onApprove={() => setApproveTarget(item)}
            onReject={() => setRejectTarget(item)}
          />
        )}
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
        report={approveTarget}
        onClose={() => setApproveTarget(null)}
        onApproved={() => setApproveTarget(null)}
      />
      <RejectReasonDialog
        visible={rejectTarget !== null}
        report={rejectTarget}
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
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    marginTop: 16, // the wavy header curve dips unevenly, so a negative overlap here clips the numbers
    marginHorizontal: -20, // cancel listContent's paddingHorizontal so this spans edge-to-edge
    paddingVertical: 20,
    justifyContent: 'space-evenly',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 16,
  },
  summaryColumn: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F0EC',
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
