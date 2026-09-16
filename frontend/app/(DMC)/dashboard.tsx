import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { Colors } from '../../constants/colors';
import { DMCHeader } from '../../components/DMCHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { useReportStats } from '../../hooks/useReportStats';
import { useWeeklyTrend } from '../../hooks/useWeeklyTrend';
import { useRecentActivity } from '../../hooks/useRecentActivity';

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

  const reviewed = stats.verified + stats.rejected;
  // "—" (not "0%") before anyone has reviewed anything — a real 0% would otherwise
  // look indistinguishable from "everything got rejected".
  const approvalRate = reviewed === 0 ? null : Math.round((stats.verified / reviewed) * 100);
  const maxDayCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <View style={styles.container}>
      <DMCHeader eyebrow="DMC · DASHBOARD" title="Dashboard" />

      <ScrollView contentContainerStyle={styles.content}>
        {statsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: -20, marginBottom: 16 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatTile icon="time-outline" value={String(stats.pending)} label="Pending" tint="#D68910" tintBg="#FEF5E7" />
            <StatTile icon="checkmark-circle-outline" value={String(stats.verified)} label="Verified" tint={Colors.primary} tintBg="#E8F5F2" />
            <StatTile icon="close-circle-outline" value={String(stats.rejected)} label="Rejected" tint={Colors.danger} tintBg="#FDEDEC" />
            <StatTile icon="albums-outline" value={String(stats.total)} label="Total reports" tint={Colors.textDark} tintBg="#EFF4F3" />
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
          <View style={styles.chartRow}>
            {days.map((day) => (
              <View key={day.date} style={styles.chartColumn}>
                <View style={[styles.chartBar, { height: 6 + (day.count / maxDayCount) * 74 }]} />
                <Text style={styles.chartLabel}>{new Date(day.date).toLocaleDateString([], { weekday: 'narrow' })}</Text>
              </View>
            ))}
          </View>
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
            onPress={() => Alert.alert('Coming soon', "Map isn't built yet.")}
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
        </View>

        {/* TEMP dev shortcut — remove once admin/resident sign-in flows are separated */}
        <TouchableOpacity style={styles.devButton} activeOpacity={0.7} onPress={() => router.push('/(user)/(tabs)' as any)}>
          <Text style={styles.devButtonText}>Dev: Back to Resident App</Text>
        </TouchableOpacity>
      </ScrollView>

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
    padding: 20,
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
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginTop: 14,
  },
  chartColumn: {
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: 18,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textMuted,
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
  devButton: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
    marginTop: 16,
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
