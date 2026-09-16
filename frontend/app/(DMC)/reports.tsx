import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCHeader } from '../../components/DMCHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { ReportListItem } from '../../components/ReportListItem';
import { useReports } from '../../hooks/useReports';
import { ReportStatus } from '../../types/report';

type StatusFilter = 'all' | ReportStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function AllReportsScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { reports, loading } = useReports(statusFilter);

  return (
    <View style={styles.container}>
      <DMCHeader
        eyebrow="DMC · ALL REPORTS"
        title="All Reports"
        onRightPress={() => router.push('/(DMC)/dashboard' as any)}
      />

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
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
        }
        renderItem={({ item }) => <ReportListItem report={item} onPress={() => router.push(`/(DMC)/incident/${item.id}` as any)} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {statusFilter === 'all' ? 'No reports yet' : `No ${statusFilter.toLowerCase()} reports`}
              </Text>
            </View>
          ) : null
        }
      />

      <DMCTabBar active="incidents" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
