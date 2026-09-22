import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { DMCHeader } from '../../../components/DMCHeader';
import { FloodIncidentMap } from '../../../components/FloodIncidentMap';
import { ApproveFloodIncidentDialog } from '../../../components/ApproveFloodIncidentDialog';
import { RejectFloodIncidentDialog } from '../../../components/RejectFloodIncidentDialog';
import { useFloodIncidents } from '../../../hooks/useFloodIncidents';
import { RiskLevel } from '../../../types/alert';

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  LOW: { label: 'LOW', color: '#2E75D6', bg: '#E8F1FB' },
  MEDIUM: { label: 'MEDIUM', color: '#B7860B', bg: '#FEF9E7' },
  HIGH: { label: 'HIGH', color: Colors.warning, bg: '#FEF5E7' },
  CRITICAL: { label: 'CRITICAL', color: Colors.danger, bg: '#FDEDEC' },
};

function formatDateTime(date: Date | null) {
  if (!date) return '—';
  return date.toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Detail + review screen for one auto-generated flood-affected-area polygon (see
// hooks/useFloodIncidents.ts and utils/floodIncidents.ts). This is the "5. Show on
// Map" + officer sign-off step of the Reports -> Group -> Boundary -> Polygon -> Map
// pipeline: the OpenStreetMap with the grouping circles + polygon, the
// incident summary, the member reports, and Approve/Reject on the generated area
// itself (separate from the individual reports, which are already Verified).
export default function FloodIncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { incidents, loading } = useFloodIncidents();
  const insets = useSafeAreaInsets();

  const incident = useMemo(() => incidents.find((i) => i.id === id) ?? null, [incidents, id]);

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="water-outline" size={40} color={Colors.primary} />
        <Text style={styles.notFoundText}>
          This affected area no longer exists — it may have changed as reports were added, or was already handled.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(DMC)/flood-incidents' as any)} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to flood zones</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const risk = RISK_CONFIG[incident.riskLevel];
  const generatedAt = incident.generatedAt?.toDate() ?? null;
  const mapData = {
    reports: incident.reports,
    centroid: incident.centroid,
    polygon: incident.polygon,
    radiusMeters: incident.radiusMeters,
    riskLevel: incident.riskLevel,
  };

  const handlePublishWarning = () => {
    router.push({
      pathname: '/(DMC)/create-alert',
      params: {
        title: `Flood Warning — ${incident.affectedArea}`,
        hazardType: 'flood',
        riskLevel: incident.riskLevel,
        affectedArea: incident.affectedArea,
        lat: String(incident.centroid.latitude),
        lng: String(incident.centroid.longitude),
        radius: String(Math.round(incident.radiusMeters)),
        sourceReportId: incident.reports[0]?.id ?? '',
        incidentId: incident.id,
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <DMCHeader eyebrow={`DMC · ${incident.id}`} title={incident.affectedArea} onBack={() => router.back()} compact />

      <View style={styles.mapSection}>
        <FloodIncidentMap
          data={mapData}
          reportCount={incident.reports.length}
          onExpand={() => setShowFullMap(true)}
          onReportTap={(reportId) => router.push(`/(DMC)/incident/${reportId}` as any)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningCard}>
          <View style={styles.warningHeaderRow}>
            <Ionicons name="warning" size={20} color={risk.color} />
            <Text style={styles.warningTitle}>Flood Warning</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: risk.bg }]}>
            <Text style={styles.riskPillLabel}>Risk Level: </Text>
            <Text style={[styles.riskPillValue, { color: risk.color }]}>{risk.label}</Text>
          </View>

          <DetailRow icon="water-outline" label="Hazard Type" value="Flood" />
          <DetailRow icon="location-outline" label="Affected Area" value={`${incident.affectedArea} (Polygon Area)`} />
          <DetailRow icon="document-text-outline" label="Estimated Reports" value={`${incident.reports.length} reports grouped`} />
          <DetailRow icon="time-outline" label="Generated At" value={formatDateTime(generatedAt)} />

          <View style={styles.reviewStatusRow}>
            <Text style={styles.reviewStatusLabel}>Status</Text>
            <ReviewStatusPill status={incident.reviewStatus} />
          </View>
          {incident.review?.rejectionReason && (
            <Text style={styles.rejectionReasonText}>Reason: {incident.review.rejectionReason}</Text>
          )}
        </View>

        {incident.reviewStatus === 'Pending' && (
          <View style={styles.publicWarningCard}>
            <View style={styles.publicWarningHeaderRow}>
              <Ionicons name="megaphone-outline" size={16} color={Colors.danger} />
              <Text style={styles.publicWarningTitle}>Public Warning</Text>
            </View>
            <Text style={styles.publicWarningText}>
              This affected area was auto-generated and hasn't been published yet. Approve it below before it can back a
              public warning residents will see.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>REPORTS IN THIS AREA ({incident.reports.length})</Text>
        {incident.reports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/(DMC)/incident/${report.id}` as any)}
          >
            <View style={styles.reportThumb}>
              <Ionicons name="water" size={16} color="#2E75D6" />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportRef}>{report.referenceNumber}</Text>
              <Text style={styles.reportArea} numberOfLines={1}>{report.affectedArea}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.actionsBar, { paddingBottom: 16 + insets.bottom }]}>
        {incident.reviewStatus === 'Approved' ? (
          <TouchableOpacity style={styles.publishButton} activeOpacity={0.85} onPress={handlePublishWarning}>
            <Ionicons name="megaphone" size={16} color={Colors.white} />
            <Text style={styles.publishButtonText}>{incident.review?.warningId ? 'Publish Another Warning' : 'Publish Public Warning'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.rejectButton} activeOpacity={0.8} onPress={() => setShowReject(true)}>
              <Text style={styles.rejectButtonText}>{incident.reviewStatus === 'Rejected' ? 'Update Reason' : 'Reject'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveButton} activeOpacity={0.8} onPress={() => setShowApprove(true)}>
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ApproveFloodIncidentDialog visible={showApprove} incident={incident} onClose={() => setShowApprove(false)} onApproved={() => setShowApprove(false)} />
      <RejectFloodIncidentDialog visible={showReject} incident={incident} onClose={() => setShowReject(false)} onRejected={() => setShowReject(false)} />

      <Modal visible={showFullMap} animationType="slide" onRequestClose={() => setShowFullMap(false)}>
        <View style={styles.fullMapContainer}>
          <FloodIncidentMap data={mapData} reportCount={incident.reports.length} />
          <TouchableOpacity style={[styles.fullMapClose, { top: insets.top + 12 }]} activeOpacity={0.8} onPress={() => setShowFullMap(false)}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={Colors.textMuted} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ReviewStatusPill({ status }: { status: 'Pending' | 'Approved' | 'Rejected' }) {
  const config = {
    Pending: { color: '#D68910', bg: '#FEF5E7', label: 'Pending Officer Approval' },
    Approved: { color: Colors.primary, bg: '#E8F5F2', label: 'Approved' },
    Rejected: { color: Colors.danger, bg: '#FDEDEC', label: 'Rejected' },
  }[status];
  return (
    <View style={[styles.reviewPill, { backgroundColor: config.bg }]}>
      <Text style={[styles.reviewPillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, paddingHorizontal: 30 },
  notFoundText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
  backLink: { paddingVertical: 8, paddingHorizontal: 16 },
  backLinkText: { color: Colors.primary, fontWeight: '700' },
  mapSection: { width: '100%', height: 280, backgroundColor: '#0b1f1c' },
  content: { padding: 20, paddingBottom: 20 },
  warningCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  warningHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  warningTitle: { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  riskPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14 },
  riskPillLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMedium },
  riskPillValue: { fontSize: 13, fontWeight: '800' },
  detailRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.3, marginBottom: 2 },
  detailValue: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  reviewStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F5F4' },
  reviewStatusLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMedium },
  reviewPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  reviewPillText: { fontSize: 11, fontWeight: '700' },
  rejectionReasonText: { fontSize: 12, color: Colors.textLight, marginTop: 8 },
  publicWarningCard: {
    backgroundColor: '#FDEDEC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  publicWarningHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  publicWarningTitle: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  publicWarningText: { fontSize: 12, color: Colors.textDark, lineHeight: 17 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 12 },
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
  reportThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F1FB', justifyContent: 'center', alignItems: 'center' },
  reportInfo: { flex: 1 },
  reportRef: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  reportArea: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  actionsBar: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: '#F0F5F4' },
  rejectButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: '#F3D4D2' },
  rejectButtonText: { color: Colors.danger, fontWeight: '700' },
  approveButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.primary },
  approveButtonText: { color: Colors.white, fontWeight: '700' },
  publishButton: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.danger },
  publishButtonText: { color: Colors.white, fontWeight: '700' },
  fullMapContainer: { flex: 1, backgroundColor: '#0b1f1c' },
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
});
