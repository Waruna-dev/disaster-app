import React, { useMemo } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { TrendLineChart } from '../../components/TrendLineChart';
import { useReportStats } from '../../hooks/useReportStats';
import { useWeeklyTrend } from '../../hooks/useWeeklyTrend';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import { useReports } from '../../hooks/useReports';
import { groupPendingReports } from '../../utils/reportGrouping';

const TREND_SUBMITTED_COLOR = '#2E75D6';
const TREND_VERIFIED_COLOR = Colors.primary;

// Parse the YYYY-MM-DD key as a *local* date — new Date('YYYY-MM-DD') is UTC midnight,
// which is the previous day anywhere west of UTC.
function weekdayInitial(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'narrow' });
}

function formatRelative(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp.toDate().getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export default function DmcDashboardScreen() {
  const { stats, loading: statsLoading } = useReportStats();
  const { days } = useWeeklyTrend();
  const { reports: recentActivity, loading: activityLoading } = useRecentActivity();
  const { reports: pendingReports } = useReports('Pending');
  // Same clustering the Report Groups screen shows, so the tile and that screen agree.
  const groupCount = useMemo(() => groupPendingReports(pendingReports).length, [pendingReports]);

  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const reviewed = stats.verified + stats.rejected;
  // "—" (not "0%") before anyone has reviewed anything — a real 0% would otherwise
  // look indistinguishable from "everything got rejected".
  const approvalRate = reviewed === 0 ? null : Math.round((stats.verified / reviewed) * 100);
  const submittedTotal = days.reduce((sum, d) => sum + d.submitted, 0);
  const verifiedTotal = days.reduce((sum, d) => sum + d.verified, 0);

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DMC · DASHBOARD" title="Dashboard" scrollY={scrollY} />

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 4 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {statsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatTile
              icon="git-network-outline"
              value={String(groupCount)}
              label="Grouped incidents"
              fullWidth
              tint="#2E75D6"
              tintBg="#E8F1FB"
              onPress={() => router.push('/(DMC)/report-groups' as any)}
            />
            <StatTile
              icon="time-outline"
              value={String(stats.pending)}
              label="Pending"
              tint="#D68910"
              tintBg="#FEF5E7"
              onPress={() => router.push({ pathname: '/(DMC)/reports', params: { status: 'Pending' } } as any)}
            />
            <StatTile
              icon="checkmark-circle-outline"
              value={String(stats.verified)}
              label="Verified"
              tint={Colors.primary}
              tintBg="#E8F5F2"
              onPress={() => router.push({ pathname: '/(DMC)/reports', params: { status: 'Verified' } } as any)}
            />
            <StatTile
              icon="close-circle-outline"
              value={String(stats.rejected)}
              label="Rejected"
              tint={Colors.danger}
              tintBg="#FDEDEC"
              onPress={() => router.push({ pathname: '/(DMC)/reports', params: { status: 'Rejected' } } as any)}
            />
            <StatTile
              icon="albums-outline"
              value={String(stats.total)}
              label="Total reports"
              tint={Colors.textDark}
              tintBg="#EFF4F3"
              onPress={() => router.push({ pathname: '/(DMC)/reports', params: { status: 'all' } } as any)}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.approvalHeaderRow}>
            <Text style={styles.sectionTitle}>APPROVAL RATE</Text>
            <Text style={styles.approvalValue}>{approvalRate === null ? '—' : `${approvalRate}%`}</Text>
          </View>
          <Text style={styles.approvalSubtext}>
            {reviewed === 0 ? 'No reports reviewed yet' : `${stats.verified} verified · ${stats.rejected} rejected`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>WEEKLY TREND</Text>
          <Text style={styles.trendSubtext}>Reports received and verified per day, last 7 days</Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TREND_SUBMITTED_COLOR }]} />
              <Text style={styles.legendText}>Received {submittedTotal}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TREND_VERIFIED_COLOR }]} />
              <Text style={styles.legendText}>Verified {verifiedTotal}</Text>
            </View>
          </View>

          <TrendLineChart
            labels={days.map((d) => weekdayInitial(d.date))}
            series={[
              { key: 'submitted', label: 'Received', color: TREND_SUBMITTED_COLOR, values: days.map((d) => d.submitted) },
              { key: 'verified', label: 'Verified', color: TREND_VERIFIED_COLOR, values: days.map((d) => d.verified) },
            ]}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          {activityLoading && recentActivity.length === 0 ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>Nothing reviewed yet</Text>
          ) : (
            recentActivity.map((item) => {
              const isVerified = item.status === 'Verified';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.activityRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(DMC)/incident/${item.id}` as any)}
                >
                  <View style={[styles.activityIcon, { backgroundColor: isVerified ? '#E8F5F2' : '#FDEDEC' }]}>
                    <Ionicons
                      name={isVerified ? 'checkmark' : 'close'}
                      size={16}
                      color={isVerified ? Colors.primary : Colors.danger}
                    />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>
                      {item.disasterType === 'flood' ? 'Flood' : 'Landslide'} in {item.affectedArea}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      {isVerified ? 'Verified' : 'Rejected'} · {formatRelative(item.reviewedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.quickNavGrid}>
          <TouchableOpacity style={styles.quickNavTile} activeOpacity={0.8} onPress={() => router.push('/(DMC)/incidents' as any)}>
            <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Pending Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickNavTile} activeOpacity={0.8} onPress={() => router.push('/(DMC)/reports' as any)}>
            <Ionicons name="albums-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>All Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavTile}
            activeOpacity={0.8}
            onPress={() => router.push('/(DMC)/map' as any)}
          >
            <Ionicons name="location-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavTile}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming soon', "Analytics isn't built yet.")}
          >
            <Ionicons name="bar-chart-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavTile}
            activeOpacity={0.8}
            onPress={() => router.push('/(DMC)/flood-warning' as any)}
          >
            <Ionicons name="water-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Flood Warning</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavTile}
            activeOpacity={0.8}
            onPress={() => router.push('/(DMC)/flood-incidents' as any)}
          >
            <Ionicons name="map-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Flood Zones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickNavTile}
            activeOpacity={0.8}
            onPress={() => router.push('/(DMC)/alerts' as any)}
          >
            <Ionicons name="megaphone-outline" size={22} color={Colors.primary} />
            <Text style={styles.quickNavLabel}>Public Warnings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createWarningButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(DMC)/create-alert' as any)}
        >
          <Ionicons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.createWarningText}>Create Public Warning</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      <DMCTabBar active="home" />
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  approvalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  approvalSubtext: {
    fontSize: 13,
    color: Colors.textLight,
  },
  trendSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 6,
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
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickNavTile: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  quickNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  createWarningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 16,
  },
  createWarningText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
