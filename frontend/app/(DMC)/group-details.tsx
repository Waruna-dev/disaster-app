import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { DMCHeader } from '../../components/DMCHeader';
import { ApproveConfirmDialog } from '../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../components/RejectReasonDialog';
import { useReports } from '../../hooks/useReports';
import { useWarnings } from '../../hooks/useWarnings';
import { RiskLevel } from '../../types/alert';
import { PinnedReport, WarningZone, buildReportsMapHtml } from '../../utils/reportMap';
import { getWarningStatus } from '../../utils/warningStatus';

const WARNING_RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#2E75D6',
  MEDIUM: '#EAB308',
  HIGH: Colors.warning,
  CRITICAL: Colors.danger,
};

const DISASTER_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; tint: string }> = {
  flood: { icon: 'water', label: 'Flood', bg: '#E8F1FB', tint: '#2E75D6' },
  landslide: { icon: 'triangle', label: 'Landslide', bg: '#F1EBE3', tint: '#8A5A2B' },
};

function formatDate(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_SECTION_HEIGHT = Math.min(Math.max(SCREEN_HEIGHT * 0.4, 300), 420);

// The last stop in the grouping flow: Resident reports -> automatic grouping
// (report-groups.tsx) -> this screen's map + officer review -> Approve marks every
// report in the cluster Verified, which is exactly what turns their pins green on
// the DMC Main Map (app/(DMC)/map.tsx already colors Verified reports that way) —
// so "Verified Zone -> DMC Main Map" is just navigating there after approving.
export default function GroupDetailsScreen() {
  const { ids, groupId } = useLocalSearchParams<{ ids?: string; groupId?: string }>();
  const wantedIds = useMemo(() => new Set((ids ?? '').split(',').filter(Boolean)), [ids]);

  const { reports: pendingReports, loading } = useReports('Pending');
  const groupReports = useMemo(() => pendingReports.filter((r) => wantedIds.has(r.id)), [pendingReports, wantedIds]);
  const { warnings } = useWarnings();

  const insets = useSafeAreaInsets();
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  const pins = useMemo(() => groupReports.filter((r): r is PinnedReport => !!r.location), [groupReports]);
  // Same "everything on one map" treatment as the DMC Main Map (app/(DMC)/map.tsx) —
  // an officer reviewing a group should see any active public warning nearby
  // without leaving this screen. Active only, same reasoning as the main map.
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
  const mapHtml = useMemo(() => buildReportsMapHtml(pins, [], warningZones), [pins, warningZones]);

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'viewDetails' && data.id) {
        router.push(`/(DMC)/incident/${data.id}` as any);
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

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (groupReports.length === 0) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="checkmark-done-circle-outline" size={40} color={Colors.primary} />
        <Text style={styles.notFoundText}>This group has already been reviewed.</Text>
        <TouchableOpacity onPress={() => router.replace('/(DMC)/report-groups' as any)} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to groups</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const disaster = DISASTER_CONFIG[groupReports[0].disasterType];

  return (
    <View style={styles.container}>
      <DMCHeader
        eyebrow={`DMC · GROUP DETAILS · ${groupId ?? ''}`}
        title={`${disaster.label} · ${groupReports.length} reports`}
        onBack={() => router.back()}
        compact
      />

      <View style={[styles.mapSection, { height: MAP_SECTION_HEIGHT }]}>
        <WebView style={StyleSheet.absoluteFill} originWhitelist={['*']} source={{ html: mapHtml }} onMessage={handleMapMessage} />

        <View style={styles.mapOverlayRow} pointerEvents="box-none">
          <TouchableOpacity style={styles.expandButton} activeOpacity={0.8} onPress={() => setShowFullMap(true)}>
            <Ionicons name="expand" size={18} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        {warningZones.length > 0 && (
          <View style={styles.legend} pointerEvents="none">
            <Text style={styles.legendGroupLabel}>WARNINGS</Text>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((level) => (
              <View key={level} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: WARNING_RISK_COLOR[level] }]} />
                <Text style={styles.legendLabel}>{level}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.mapHint}>Pins mark each resident report grouped into this incident. Tap a pin to open it, or expand the map for a closer look.</Text>

        <Text style={styles.reviewHeading}>OFFICER REVIEW</Text>

        {groupReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/(DMC)/incident/${report.id}` as any)}
          >
            {(report.photoUrls?.[0] ?? report.photoUrl) ? (
              <Image source={{ uri: report.photoUrls?.[0] ?? report.photoUrl ?? undefined }} style={styles.reportThumb} />
            ) : (
              <View style={[styles.reportThumb, styles.reportThumbPlaceholder, { backgroundColor: disaster.bg }]}>
                <Ionicons name={disaster.icon} size={18} color={disaster.tint} />
              </View>
            )}
            <View style={styles.reportInfo}>
              <Text style={styles.reportRef}>{report.referenceNumber}</Text>
              <Text style={styles.reportArea} numberOfLines={1}>
                {report.affectedArea}
              </Text>
              <Text style={styles.reportMeta}>{formatDate(report.createdAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.actionsBar, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity style={styles.rejectButton} activeOpacity={0.8} onPress={() => setShowReject(true)}>
          <Text style={styles.rejectButtonText}>Reject All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} activeOpacity={0.8} onPress={() => setShowApprove(true)}>
          <Text style={styles.approveButtonText}>Approve All</Text>
        </TouchableOpacity>
      </View>

      <ApproveConfirmDialog
        visible={showApprove}
        reports={groupReports}
        onClose={() => setShowApprove(false)}
        onApproved={() => {
          setShowApprove(false);
          router.replace('/(DMC)/map' as any);
        }}
      />
      <RejectReasonDialog
        visible={showReject}
        reports={groupReports}
        onClose={() => setShowReject(false)}
        onRejected={() => {
          setShowReject(false);
          router.replace('/(DMC)/report-groups' as any);
        }}
      />

      <Modal visible={showFullMap} animationType="slide" onRequestClose={() => setShowFullMap(false)}>
        <View style={styles.fullMapContainer}>
          <WebView style={StyleSheet.absoluteFill} originWhitelist={['*']} source={{ html: mapHtml }} onMessage={handleMapMessage} />
          <TouchableOpacity
            style={[styles.fullMapClose, { top: insets.top + 12 }]}
            activeOpacity={0.8}
            onPress={() => setShowFullMap(false)}
          >
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
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
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 20,
  },
  mapSection: {
    width: '100%',
    backgroundColor: '#E3EFEC',
    position: 'relative',
    overflow: 'hidden',
  },
  mapOverlayRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  expandButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  legend: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  legendGroupLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    opacity: 0.7,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: '#E3EFEC',
  },
  fullMapClose: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,61,57,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  mapHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 20,
    lineHeight: 17,
  },
  reviewHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F0EC',
    gap: 12,
  },
  reportThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E3EFEC',
  },
  reportThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportRef: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reportArea: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  reportMeta: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F3D4D2',
  },
  rejectButtonText: {
    color: Colors.danger,
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  approveButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
