import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, Modal, Alert, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { fetchReportById, deleteReport } from '../../../services/reportService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function ReportDetailsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const data = await fetchReportById(id as string);
        setReport(data);
      } catch (error) {
        console.error('Error fetching report details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>{t('reportDetails.notFound') || 'Report not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.primary }}>{t('reportDetails.goBack') || 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerHeight = 160 + insets.top;

  // Formatting
  const d = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
  const timeAgo = isToday(d) ? 'Submitted today' : formatDistanceToNow(d, { addSuffix: true });
  const exactDate = format(d, 'dd MMM yyyy, h:mm a');

  const rDate = report.reviewedAt ? (report.reviewedAt.toDate ? report.reviewedAt.toDate() : new Date(report.reviewedAt)) : null;
  const exactReviewedDate = rDate ? format(rDate, 'dd MMM yyyy, h:mm a') : null;
  
  const typeStr = report.disasterType?.toUpperCase() + ' REPORT' || 'REPORT';
  const statusRaw = report.status?.toLowerCase() || 'pending';
  const statusLabel = statusRaw === 'verified' || statusRaw === 'approved' ? 'APPROVED' : statusRaw === 'rejected' ? 'REJECTED' : 'PENDING';

  let statusColor = '#D68910';
  let statusBg = '#FEF5E7';
  if (statusLabel === 'APPROVED') { statusColor = Colors.primary; statusBg = '#E8F5F2'; }
  if (statusLabel === 'REJECTED') { statusColor = Colors.danger; statusBg = '#FDEDEC'; }

  // Collect photos
  const photos: string[] = [];
  if (report.photoUrls && Array.isArray(report.photoUrls)) {
    photos.push(...report.photoUrls);
  } else if (report.photoUrl) {
    photos.push(report.photoUrl);
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Image Modal */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={[styles.modalCloseButton, { top: insets.top + 20 }]} onPress={() => setFullScreenImage(null)}>
            <Ionicons name="close" size={32} color={Colors.white} />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Header Background */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight, transform: [{ translateY: headerTranslateY }] }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 402 180`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Path
            d="M0 0 H402 V150 Q201 190 0 150 Z"
            fill={Colors.gradientStart}
          />
        </Svg>
      </Animated.View>

      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
        <View style={[styles.headerBarContent, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('reportDetails.reportDetails') || 'Report Details'}</Text>
          <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            Alert.alert(
              t('reportDetails.deleteReport') || 'Delete Report',
              t('reportDetails.deleteConfirm') || 'Are you sure you want to delete this report? This action cannot be undone.',
              [
                { text: t('reportDetails.cancel') || 'Cancel', style: 'cancel' },
                { 
                  text: t('reportDetails.delete') || 'Delete', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteReport(id as string);
                      Alert.alert(t('reportDetails.success') || 'Success', t('reportDetails.deletedSuccess') || 'Report deleted successfully');
                      router.replace('/(user)/(tabs)/reports');
                    } catch (e) {
                      Alert.alert(t('reportDetails.error') || 'Error', t('reportDetails.deleteFailed') || 'Failed to delete report');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight - 100 }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Main Summary Card */}
        <View style={styles.summaryCard}>
          <View style={[styles.statusMarker, { backgroundColor: statusColor }]} />
          <View style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <View style={styles.typeRow}>
                <View style={styles.typeIcon}>
                  <Ionicons name={report.disasterType === 'Flood' ? 'water' : 'warning'} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.typeText}>{typeStr}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.reportTitle} numberOfLines={1}>{report.affectedArea} {report.disasterType?.toLowerCase()}</Text>
            <View style={styles.summaryFooter}>
              <Text style={styles.refText}>REFERENCE <Text style={styles.refBold}>{report.referenceNumber || report.id.substring(0,8)}</Text></Text>
              <Text style={styles.timeText}>{timeAgo}</Text>
            </View>
          </View>
        </View>

        {/* Report Status Progress */}
        <Text style={styles.sectionTitle}>{t('reportDetails.reportStatus') || 'Report status'}</Text>
        <View style={styles.card}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack} />
            <View style={[styles.progressTrackActive, statusLabel === 'APPROVED' ? { right: 45 } : { right: '50%' }]} />
            
            <View style={styles.progressNode}>
              <View style={[styles.nodeCircle, styles.nodeCompleted]}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              </View>
              <Text style={styles.nodeLabelCompleted}>{t('reportDetails.submitted') || 'Submitted'}</Text>
            </View>
            
            <View style={styles.progressNode}>
              <View style={[styles.nodeCircle, statusLabel === 'APPROVED' ? styles.nodeCompleted : statusLabel === 'REJECTED' ? styles.nodeRejected : styles.nodeActive]}>
                {statusLabel === 'APPROVED' ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : statusLabel === 'REJECTED' ? <Ionicons name="close" size={16} color={Colors.white} /> : <View style={styles.nodeActiveInner} />}
              </View>
              <Text style={statusLabel === 'APPROVED' || statusLabel === 'REJECTED' ? styles.nodeLabelCompleted : styles.nodeLabelActive}>{statusLabel === 'REJECTED' ? 'Rejected' : t('reportDetails.inReview') || 'Pending'}</Text>
            </View>

            <View style={styles.progressNode}>
              <View style={[styles.nodeCircle, statusLabel === 'APPROVED' ? styles.nodeCompleted : styles.nodeInactive]}>
                 {statusLabel === 'APPROVED' && <Ionicons name="checkmark" size={16} color={Colors.white} />}
              </View>
              <Text style={styles.nodeLabelInactive}>{t('reportDetails.decision') || 'Approved'}</Text>
            </View>
          </View>

          <View style={styles.statusMessageBox}>
             <Text style={styles.statusMessageText}>
               {statusLabel === 'APPROVED' ? (t('reportDetails.reviewStatusApproved') || 'Your report has been verified by an official.') : statusLabel === 'REJECTED' ? `Rejected: ${report.rejectionReason || 'No reason provided.'}` : (t('reportDetails.reviewStatusPending') || 'A disaster-management officer is reviewing your report.')}
             </Text>
          </View>
        </View>

        {/* Report Information */}
        <Text style={styles.sectionTitle}>{t('reportDetails.reportInformation') || 'Report information'}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={24} color={Colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('reportDetails.location') || 'LOCATION'}</Text>
              <Text style={styles.infoValue}>{report.affectedArea}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('reportDetails.timeReported') || 'SUBMITTED'}</Text>
              <Text style={styles.infoValue}>{exactDate}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.linkText}>View map ›</Text>
            </TouchableOpacity>
          </View>
          {exactReviewedDate && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name={statusLabel === 'REJECTED' ? "close-circle-outline" : "shield-checkmark-outline"} size={24} color={statusLabel === 'REJECTED' ? Colors.danger : Colors.primary} style={styles.infoIcon} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>{statusLabel === 'REJECTED' ? (t('reportDetails.rejectedOn') || 'REJECTED ON') : (t('reportDetails.approvedOn') || 'APPROVED ON')}</Text>
                  <Text style={styles.infoValue}>{exactReviewedDate}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>{t('reportDetails.description') || 'Description'}</Text>
        <View style={[styles.card, { paddingVertical: 16 }]}>
          <Text style={styles.descriptionText}>
            {report.description || t('reportDetails.noDescription') || 'No description provided.'}
          </Text>
          <Text style={styles.reporterText}>{t('reportDetails.reportedBy') || 'Reported by'} {report.userId === 'anonymous' ? (t('reportDetails.anonymous') || 'Anonymous') : (t('reportDetails.user') || 'User')}</Text>
        </View>

        {/* Photo Evidence */}
        <Text style={styles.sectionTitle}>{t('reportDetails.photoEvidence') || 'Photo evidence'}</Text>
        {photos.length > 0 ? (
          photos.map((uri, index) => (
            <View key={index} style={styles.photoCard}>
              <Image source={{ uri }} style={styles.photoThumbnail} />
              <Text style={styles.photoName} numberOfLines={1}>evidence-photo-{index + 1}.jpg</Text>
              <TouchableOpacity onPress={() => setFullScreenImage(uri)}>
                <Text style={styles.linkText}>View photo</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.photoCard}>
            <View style={[styles.photoThumbnail, { backgroundColor: '#F0F5F4', justifyContent: 'center', alignItems: 'center' }]}>
               <Ionicons name="image-outline" size={24} color={Colors.placeholder} />
            </View>
            <Text style={styles.photoName} numberOfLines={1}>No photo uploaded</Text>
          </View>
        )}

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 0,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statusMarker: {
    width: 6,
    height: '100%',
  },
  summaryContent: {
    flex: 1,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.placeholder,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  refBold: {
    fontWeight: '700',
    color: Colors.textDark,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  progressTrack: {
    position: 'absolute',
    top: 14,
    left: 45,
    right: 45,
    height: 4,
    backgroundColor: '#C8D6D5',
    zIndex: 1,
  },
  progressTrackActive: {
    position: 'absolute',
    top: 14,
    left: 45,
    height: 4,
    backgroundColor: Colors.primary,
    zIndex: 2,
  },
  progressNode: {
    alignItems: 'center',
    width: 80,
    zIndex: 3,
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderWidth: 2,
  },
  nodeCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  nodeActive: {
    borderColor: '#F39C12',
    backgroundColor: '#FEF5E7',
  },
  nodeActiveInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F39C12',
  },
  nodeInactive: {
    borderColor: '#C8D6D5',
    backgroundColor: '#F0F5F4',
  },
  nodeRejected: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  nodeLabelCompleted: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  nodeLabelActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B9770E',
  },
  nodeLabelInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  statusMessageBox: {
    backgroundColor: '#FFF8EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B9770E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.placeholder,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 16,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textDark,
    marginBottom: 12,
  },
  reporterText: {
    fontSize: 12,
    color: Colors.placeholder,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  photoThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
  },
  photoName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
});
