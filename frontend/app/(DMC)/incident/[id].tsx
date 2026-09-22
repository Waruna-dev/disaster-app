import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { DMCHeader } from '../../../components/DMCHeader';
import { ApproveConfirmDialog } from '../../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../../components/RejectReasonDialog';
import { useReport } from '../../../hooks/useReport';
import { useResidentNames } from '../../../hooks/useResidentNames';
import { geocodeAddress } from '../../../services/geocodeService';
import { DisasterType, ReportLocation, ReportStatus } from '../../../types/report';
import { DISASTER_SYMBOL } from '../../../utils/reportMap';

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Single-pin OpenStreetMap (Leaflet) preview so a DMC officer can immediately see
// where the report was filed, at a glance, without leaving the review screen. Uses
// a WebView instead of react-native-maps for the same reason as app/(DMC)/map.tsx:
// react-native-maps' native Google Maps view renders solid black on Android under
// React Native's New Architecture (react-native-maps/react-native-maps#5462).
function buildLocationHtml(location: ReportLocation, color: string, disasterType: DisasterType): string {
  const symbol = DISASTER_SYMBOL[disasterType];
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #FFFFFF; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
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
    var icon = L.divIcon({
      html: '<div class="pin">${symbol}</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([${location.latitude}, ${location.longitude}], { icon: icon }).addTo(map);
  </script>
</body>
</html>`;
}

export default function AdminReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { report, loading } = useReport(id);
  const names = useResidentNames(report ? [report.userId] : []);
  const insets = useSafeAreaInsets();

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null);

  // Older/permission-denied submissions have no saved GPS coordinates. Fall back to
  // geocoding the typed affected-area address so the map still has a pin to show.
  const [geocodedLocation, setGeocodedLocation] = useState<ReportLocation | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (report?.location || !report?.affectedArea) {
      setGeocodedLocation(null);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    geocodeAddress(report.affectedArea).then((result) => {
      if (!cancelled) {
        setGeocodedLocation(result);
        setGeocoding(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [report?.location, report?.affectedArea]);

  const effectiveLocation = report?.location ?? geocodedLocation;
  const isApproximateLocation = !report?.location && !!geocodedLocation;

  const locationHtml = useMemo(() => {
    if (!effectiveLocation || !report) return null;
    return buildLocationHtml(effectiveLocation, STATUS_PIN[report.status], report.disasterType);
  }, [effectiveLocation, report?.status, report?.disasterType]);

  const photos = useMemo(() => {
    if (!report) return [];
    if (report.photoUrls && report.photoUrls.length > 0) return report.photoUrls;
    if (report.photoUrl) return [report.photoUrl];
    return [];
  }, [report]);

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
            <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{report.contactNumber || 'No contact provided'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="list-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{report.affectedItems?.length > 0 ? report.affectedItems.join(', ') : 'None specified'}</Text>
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
            <>
              <View style={styles.mapPreview}>
                <WebView style={StyleSheet.absoluteFill} originWhitelist={['*']} source={{ html: locationHtml }} />
              </View>
              {isApproximateLocation && (
                <Text style={styles.approximateText}>Approximate location, estimated from the affected area address</Text>
              )}
            </>
          ) : geocoding ? (
            <View style={styles.mapMissing}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.mapMissingText}>Locating affected area…</Text>
            </View>
          ) : (
            <View style={styles.mapMissing}>
              <Ionicons name="location-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.mapMissingText}>No location data for this report</Text>
            </View>
          )}
        </View>

        {photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>EVIDENCE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((uri, index) => (
                <TouchableOpacity key={`${uri}-${index}`} activeOpacity={0.85} onPress={() => setFullScreenIndex(index)}>
                  <Image source={{ uri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
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
        <View style={[styles.actionsBar, { paddingBottom: 16 + insets.bottom }]}>
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
        reports={[report]}
        onClose={() => setShowApprove(false)}
        onApproved={() => {
          setShowApprove(false);
          router.back();
        }}
      />
      <RejectReasonDialog
        visible={showReject}
        reports={[report]}
        onClose={() => setShowReject(false)}
        onRejected={() => {
          setShowReject(false);
          router.back();
        }}
      />

      <Modal visible={fullScreenIndex !== null} transparent animationType="fade" onRequestClose={() => setFullScreenIndex(null)}>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity style={styles.imageModalClose} activeOpacity={0.8} onPress={() => setFullScreenIndex(null)}>
            <Ionicons name="close" size={30} color={Colors.white} />
          </TouchableOpacity>
          {fullScreenIndex !== null && (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: fullScreenIndex * SCREEN_WIDTH, y: 0 }}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setFullScreenIndex(newIndex);
                }}
              >
                {photos.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imageModalPage}>
                    <Image source={{ uri }} style={styles.fullScreenImage} resizeMode="contain" />
                  </View>
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.imageModalCounter}>
                  <Text style={styles.imageModalCounterText}>{fullScreenIndex + 1} / {photos.length}</Text>
                </View>
              )}
            </>
          )}
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
  photoRow: {
    gap: 12,
  },
  photo: {
    width: 220,
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
  approximateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
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
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  imageModalCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  imageModalCounterText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
