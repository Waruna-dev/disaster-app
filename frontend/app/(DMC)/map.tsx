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
import { useWarnings } from '../../hooks/useWarnings';
import { ReportStatus } from '../../types/report';
import { RiskLevel } from '../../types/alert';
import { IncidentZone, PinnedReport, STATUS_PIN, WarningZone, buildReportsMapHtml } from '../../utils/reportMap';
import { getWarningStatus } from '../../utils/warningStatus';

const WARNING_RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

type StatusFilter = 'all' | ReportStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function MapScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fullMap, setFullMap] = useState(false);
  // Collapsed by default — the combined incidents + warnings legend got tall
  // enough to cover a chunk of the map, so it starts as a small pill and an
  // officer taps it open only when they need to check what a color means.
  const [legendExpanded, setLegendExpanded] = useState(false);
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
  const { warnings } = useWarnings();

  const pins = useMemo(() => reports.filter((r): r is PinnedReport => !!r.location), [reports]);

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

  // Only Active warnings — Expired/Cancelled ones aren't part of the current
  // operational picture and would just clutter the main map.
  const warningZones = useMemo<WarningZone[]>(
    () =>
      warnings
        .filter((w) => getWarningStatus(w) === 'Active')
        .map((w) => ({
          id: w.id,
          title: w.title,
          affectedArea: w.affectedArea,
          riskLevel: w.riskLevel,
          status: getWarningStatus(w),
          centroid: { latitude: w.latitude, longitude: w.longitude },
          polygon: w.polygon ?? null,
          radiusMeters: w.radius,
        })),
    [warnings]
  );

  const mapHtml = useMemo(() => buildReportsMapHtml(pins, zones, warningZones), [pins, zones, warningZones]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'viewDetails' && data.id) {
        router.push(`/(DMC)/incident/${data.id}` as any);
      } else if (data.type === 'viewFloodIncident' && data.id) {
        router.push(`/(DMC)/flood-incident/${data.id}` as any);
      } else if (data.type === 'editWarning' && data.id) {
        const warning = warnings.find((w) => w.id === data.id);
        if (!warning) return;
        router.push({
          pathname: '/(DMC)/create-alert',
          params: {
            warningId: warning.id,
            title: warning.title,
            hazardType: warning.hazardType,
            riskLevel: warning.riskLevel,
            affectedArea: warning.affectedArea,
            message: warning.message,
            lat: String(warning.latitude),
            lng: String(warning.longitude),
            radius: String(warning.radius),
            polygon: warning.polygon && warning.polygon.length >= 3 ? JSON.stringify(warning.polygon) : undefined,
            originalCreatedAt: warning.createdAt ? warning.createdAt.toDate().toISOString() : undefined,
          },
        } as any);
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
          <TouchableOpacity
            style={[styles.legendHeader, legendExpanded && styles.legendHeaderExpanded]}
            activeOpacity={0.7}
            onPress={() => setLegendExpanded((v) => !v)}
          >
            <Ionicons name="color-palette-outline" size={14} color={Colors.textMedium} />
            <Text style={styles.legendHeaderLabel}>Legend</Text>
            <Ionicons name={legendExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>

          {legendExpanded && (
            <View style={styles.legendBody}>
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
              {warningZones.length > 0 && (
                <>
                  <View style={styles.legendDivider} />
                  <Text style={styles.legendGroupLabel}>PUBLIC WARNINGS</Text>
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((level) => (
                    <View key={level} style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: WARNING_RISK_COLOR[level] }]} />
                      <Text style={styles.legendLabel}>{level}</Text>
                    </View>
                  ))}
                </>
              )}
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
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  legendHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F2',
  },
  legendHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMedium,
  },
  legendBody: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
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
  legendDivider: {
    height: 1,
    backgroundColor: '#EEF3F2',
    marginVertical: 2,
  },
  legendGroupLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textMuted,
  },
});
