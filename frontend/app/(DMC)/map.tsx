import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { DMCNavHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { useReports } from '../../hooks/useReports';
import { useFloodIncidents } from '../../hooks/useFloodIncidents';
import { ReportStatus } from '../../types/report';
import { IncidentZone, PinnedReport, STATUS_PIN, buildReportsMapHtml } from '../../utils/reportMap';

type StatusFilter = 'all' | ReportStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Rejected', label: 'Rejected' },
];

// TEMP: sample pins so markers are visible while real reports don't have saved
// coordinates yet. Remove once report creation reliably captures location.
const SAMPLE_PINS: PinnedReport[] = [
  {
    id: 'sample-1',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Colombo',
    location: { latitude: 6.9271, longitude: 79.8612 },
    description: 'Sample pin for testing map markers.',
    status: 'Pending',
    referenceNumber: 'REP-00001',
    createdAt: null,
  },
  {
    id: 'sample-2',
    userId: 'sample',
    disasterType: 'landslide',
    affectedArea: 'Kandy',
    location: { latitude: 7.2906, longitude: 80.6337 },
    description: 'Sample pin for testing map markers.',
    status: 'Verified',
    referenceNumber: 'REP-00002',
    createdAt: null,
  },
  {
    id: 'sample-3',
    userId: 'sample',
    disasterType: 'flood',
    affectedArea: 'Galle',
    location: { latitude: 6.0535, longitude: 80.2210 },
    description: 'Sample pin for testing map markers.',
    status: 'Rejected',
    referenceNumber: 'REP-00003',
    createdAt: null,
  },
];

export default function MapScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fullMap, setFullMap] = useState(false);
  const insets = useSafeAreaInsets();

  // Hardware back should leave full-map mode first, not the whole screen.
  useEffect(() => {
    if (!fullMap) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFullMap(false);
      return true;
    });
    return () => sub.remove();
  }, [fullMap]);
  const { reports, loading } = useReports(statusFilter);
  // Rejected auto-generated areas are dead ends (an officer already dismissed the
  // grouping) — not worth cluttering the main map with, unlike Pending/Approved.
  const { incidents: floodIncidents } = useFloodIncidents();

  const pins = useMemo(() => {
    const realPins = reports.filter((r): r is PinnedReport => !!r.location);
    const samplePins = SAMPLE_PINS.filter((p) => statusFilter === 'all' || p.status === statusFilter);
    return [...realPins, ...samplePins];
  }, [reports, statusFilter]);

  const zones = useMemo<IncidentZone[]>(
    () =>
      floodIncidents
        .filter((i) => i.reviewStatus !== 'Rejected')
        .map((i) => ({
          id: i.id,
          affectedArea: i.affectedArea,
          reportCount: i.reports.length,
          riskLevel: i.riskLevel,
          reviewStatus: i.reviewStatus,
          centroid: i.centroid,
          polygon: i.polygon,
          radiusMeters: i.radiusMeters,
        })),
    [floodIncidents]
  );

  const mapHtml = useMemo(() => buildReportsMapHtml(pins, zones, 'osm'), [pins, zones]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'viewDetails' && data.id) {
        router.push(`/(DMC)/incident/${data.id}` as any);
      } else if (data.type === 'viewFloodIncident' && data.id) {
        router.push(`/(DMC)/flood-incident/${data.id}` as any);
      }
    } catch {
      // ignore malformed messages from the map page
    }
  };

  return (
    <View style={[styles.container, fullMap && { paddingTop: insets.top }]}>
      {!fullMap && (
        <DMCNavHeader eyebrow="DMC · MAP" title="Incident Map" onBack={() => router.push('/(DMC)/dashboard' as any)} />
      )}

      {!fullMap && (
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.key === statusFilter;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              activeOpacity={0.7}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      )}

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <WebView
            style={StyleSheet.absoluteFill}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={handleMessage}
          />
        )}

        <View style={styles.legend}>
          {(['Pending', 'Verified', 'Rejected'] as ReportStatus[]).map((status) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_PIN[status] }]} />
              <Text style={styles.legendLabel}>{status}</Text>
            </View>
          ))}
          {zones.length > 0 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: Colors.danger }]} />
              <Text style={styles.legendLabel}>Affected area</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.fullMapButton, fullMap && { bottom: insets.bottom + 16 }]}
          activeOpacity={0.8}
          onPress={() => setFullMap((v) => !v)}
        >
          <Ionicons name={fullMap ? 'contract-outline' : 'expand-outline'} size={16} color={Colors.primary} />
          <Text style={styles.fullMapLabel}>{fullMap ? 'Exit full map' : 'Full map'}</Text>
        </TouchableOpacity>
      </View>

      {!fullMap && <DMCTabBar active="map" />}
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
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  mapWrap: {
    flex: 1,
  },
  fullMapButton: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fullMapLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    opacity: 0.6,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMedium,
  },
});
