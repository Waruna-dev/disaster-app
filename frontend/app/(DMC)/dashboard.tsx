import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
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
import { useReports } from '../../hooks/useReports';

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

const MENU_LINKS: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { label: 'Home', icon: 'home-outline', route: '/(DMC)/dashboard' },
  { label: 'Incidents', icon: 'document-text-outline', route: '/(DMC)/incidents' },
  { label: 'Map', icon: 'location-outline', route: '/(DMC)/map' },
  { label: 'All Reports', icon: 'albums-outline', route: '/(DMC)/reports' },
];

export default function DmcDashboardScreen() {
  const { stats, loading: statsLoading } = useReportStats();
  const { days } = useWeeklyTrend();
  const { reports: recentActivity, loading: activityLoading } = useRecentActivity();
  const { reports: pendingReports } = useReports('Pending');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const reviewed = stats.verified + stats.rejected;
  // "—" (not "0%") before anyone has reviewed anything — a real 0% would otherwise
  // look indistinguishable from "everything got rejected".
  const approvalRate = reviewed === 0 ? null : Math.round((stats.verified / reviewed) * 100);
  const maxDayCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <View style={styles.container}>
      <DMCHeader
        eyebrow="DMC · DASHBOARD"
        title="Dashboard"
        badgeCount={stats.pending}
        onMenuPress={() => setShowMenu(true)}
        onRightPress={() => setShowNotifications(true)}
      />

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.notifOverlay} onPress={() => setShowMenu(false)}>
          <Pressable style={styles.menuPanel} onPress={() => {}}>
            {MENU_LINKS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.menuRow}
                activeOpacity={0.7}
                onPress={() => {
                  setShowMenu(false);
                  router.push(item.route as any);
                }}
              >
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
                <Text style={styles.menuRowText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => {
                setShowMenu(false);
                router.push('/(user)/(tabs)' as any);
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={Colors.textDark} />
              <Text style={styles.menuRowText}>Back to Resident App</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showNotifications} transparent animationType="fade" onRequestClose={() => setShowNotifications(false)}>
        <Pressable style={styles.notifOverlay} onPress={() => setShowNotifications(false)}>
          <Pressable style={styles.notifPanel} onPress={() => {}}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Pending Reports</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Text style={styles.notifClear}>Clear</Text>
              </TouchableOpacity>
            </View>

            {pendingReports.length === 0 ? (
              <Text style={styles.notifEmpty}>No pending reports</Text>
            ) : (
              pendingReports.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.notifRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowNotifications(false);
                    router.push(`/(DMC)/incident/${item.id}` as any);
                  }}
                >
                  <View style={styles.notifDot} />
                  <Text style={styles.notifText} numberOfLines={1}>
                    {item.disasterType === 'flood' ? 'Flood' : 'Landslide'} in {item.affectedArea}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            {pendingReports.length > 0 && (
              <TouchableOpacity
                style={styles.notifViewAll}
                activeOpacity={0.7}
                onPress={() => {
                  setShowNotifications(false);
                  router.push('/(DMC)/incidents' as any);
                }}
              >
                <Text style={styles.notifViewAllText}>View all pending reports</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {statsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: -20, marginBottom: 16 }} />
        ) : (
          <View style={styles.statsGrid}>
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
        </View>
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
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,30,28,0.25)',
  },
  menuPanel: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 6,
  },
  notifPanel: {
    position: 'absolute',
    top: 58,
    right: 16,
    width: 260,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  notifClear: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  notifEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingVertical: 8,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D68910',
  },
  notifText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textDark,
  },
  notifViewAll: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
  },
  notifViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
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
});
