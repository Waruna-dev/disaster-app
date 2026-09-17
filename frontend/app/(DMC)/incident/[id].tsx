import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { Colors } from '../../../constants/colors';
import { DMCHeader } from '../../../components/DMCHeader';
import { ApproveConfirmDialog } from '../../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../../components/RejectReasonDialog';
import { useReport } from '../../../hooks/useReport';
import { useResidentNames } from '../../../hooks/useResidentNames';
import { ReportLocation, ReportStatus } from '../../../types/report';

function formatDateTime(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#FEF5E7', text: '#D68910' },
  Verified: { bg: '#E8F5F2', text: Colors.primary },
  Rejected: { bg: '#FDEDEC', text: Colors.danger },
};

const STATUS_PIN: Record<ReportStatus, string> = {
  Pending: Colors.warning,
  Verified: Colors.primary,
  Rejected: Colors.danger,
};

// Single-pin OpenStreetMap (Leaflet) preview so a DMC officer can immediately see
// where the report was filed, at a glance, without leaving the review screen. Uses
// a WebView instead of react-native-maps for the same reason as app/(DMC)/map.tsx:
// react-native-maps' native Google Maps view renders solid black on Android under
// React Native's New Architecture (react-native-maps/react-native-maps#5462).
function buildLocationHtml(location: ReportLocation, color: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, dragging: true, scrollWheelZoom: false }).setView([${location.latitude}, ${location.longitude}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.circleMarker([${location.latitude}, ${location.longitude}], {
      radius: 10,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '${color}',
      fillOpacity: 1
    }).addTo(map);
  </script>
</body>
</html>`;
}

export default function AdminReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { report, loading } = useReport(id);
  const names = useResidentNames(report ? [report.userId] : []);

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const locationHtml = useMemo(() => {
    if (!report?.location) return null;
    return buildLocationHtml(report.location, STATUS_PIN[report.status]);
  }, [report?.location, report?.status]);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.notFoundText}>This report no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_STYLES[report.status];
  const residentName = names[report.userId] ?? 'Resident';

  return (
    <View style={styles.container}>
      <DMCHeader
        eyebrow={`${report.referenceNumber} · ${report.disasterType.toUpperCase()}`}
        title={report.affectedArea}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{report.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, styles.typeBadge]}>
            <Text style={styles.typeBadgeText}>{report.disasterType === 'flood' ? 'Flood' : 'Landslide'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="location" size={16} color={Colors.textDark} />
            <Text style={styles.rowLabel}>{report.affectedArea}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>Submitted by {residentName}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{formatDateTime(report.createdAt)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>DESCRIPTION</Text>
          <Text style={styles.description}>{report.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LOCATION</Text>
          {locationHtml ? (
            <View style={styles.mapPreview}>
              <WebView style={StyleSheet.absoluteFill} originWhitelist={['*']} source={{ html: locationHtml }} />
            </View>
          ) : (
            <View style={styles.mapMissing}>
              <Ionicons name="location-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.mapMissingText}>No location data for this report</Text>
            </View>
          )}
        </View>

        {report.photoUrl && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>EVIDENCE</Text>
            <Image source={{ uri: report.photoUrl }} style={styles.photo} />
          </View>
        )}

        {report.status !== 'Pending' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>REVIEW</Text>
            <Text style={styles.rowText}>
              {report.status === 'Verified' ? 'Approved' : 'Rejected'}
              {report.reviewedAt ? ` · ${formatDateTime(report.reviewedAt)}` : ''}
            </Text>
            {report.rejectionReason && <Text style={[styles.rowText, { marginTop: 4 }]}>Reason: {report.rejectionReason}</Text>}
          </View>
        )}
      </ScrollView>

      {report.status === 'Pending' && (
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.rejectButton} activeOpacity={0.8} onPress={() => setShowReject(true)}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} activeOpacity={0.8} onPress={() => setShowApprove(true)}>
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      <ApproveConfirmDialog
        visible={showApprove}
        report={report}
        onClose={() => setShowApprove(false)}
        onApproved={() => {
          setShowApprove(false);
          router.back();
        }}
      />
      <RejectReasonDialog
        visible={showReject}
        report={report}
        onClose={() => setShowReject(false)}
        onRejected={() => {
          setShowReject(false);
          router.back();
        }}
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
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.textLight,
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
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#E8F1FB',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E75D6',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  rowText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E3EFEC',
  },
  mapPreview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: '#E3EFEC',
    overflow: 'hidden',
  },
  mapMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  mapMissingText: {
    fontSize: 13,
    color: Colors.textMuted,
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
