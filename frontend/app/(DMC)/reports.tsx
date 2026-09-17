import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCHeader } from '../../components/DMCHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { ReportListItem } from '../../components/ReportListItem';
import { useReports } from '../../hooks/useReports';
import { ReportStatus } from '../../types/report';
import { PinnedReport, STATUS_PIN, buildReportsMapHtml } from '../../utils/reportMap';

type StatusFilter = 'all' | ReportStatus;
type ViewMode = 'list' | 'map';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Rejected', label: 'Rejected' },
];

function isStatusFilter(value: unknown): value is StatusFilter {
  return STATUS_FILTERS.some((f) => f.key === value);
}

export default function AllReportsScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(isStatusFilter(status) ? status : 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { reports, loading } = useReports(statusFilter);

  const pins = useMemo(() => reports.filter((r): r is PinnedReport => !!r.location), [reports]);
  const mapHtml = useMemo(() => buildReportsMapHtml(pins), [pins]);

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'viewDetails' && data.id) {
        router.push(`/(DMC)/incident/${data.id}` as any);
      }
    } catch {
      // ignore malformed messages from the map page
    }
  };

  return (
    <View style={styles.container}>
      <DMCHeader
        eyebrow="DMC · ALL REPORTS"
        title="All Reports"
        onBack={() => router.push('/(DMC)/dashboard' as any)}
      />

      <View style={styles.controlsRow}>
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

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            activeOpacity={0.7}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? Colors.white : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
            activeOpacity={0.7}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map-outline" size={16} color={viewMode === 'map' ? Colors.white : Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
      ) : (
        <View style={styles.mapCardWrap}>
          <View style={styles.mapCard}>
            <Text style={styles.mapCardTitle}>INCIDENT LOCATIONS</Text>
            <View style={styles.mapCardMap}>
              {loading ? (
                <View style={styles.centerFill}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : (
                <WebView
                  style={StyleSheet.absoluteFill}
                  originWhitelist={['*']}
                  source={{ html: mapHtml }}
                  onMessage={handleMapMessage}
                />
              )}

              <View style={styles.legend}>
                {(['Pending', 'Verified', 'Rejected'] as ReportStatus[]).map((s) => (
                  <View key={s} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: STATUS_PIN[s] }]} />
                    <Text style={styles.legendLabel}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <DMCTabBar active="reports" />
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F0EC',
  },
  filterRow: {
    flexDirection: 'row',
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
  mapCardWrap: {
    flex: 1,
    padding: 20,
  },
  mapCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  mapCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  mapCardMap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E3EFEC',
    position: 'relative',
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMedium,
  },
});
