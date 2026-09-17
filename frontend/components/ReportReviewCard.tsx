import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Report } from '../types/report';

interface ReportReviewCardProps {
  report: Report;
  onViewDetails: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const DISASTER_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; tint: string }> = {
  flood: { icon: 'water', label: 'Flood', bg: '#E8F1FB', tint: '#2E75D6' },
  landslide: { icon: 'triangle', label: 'Landslide', bg: '#F1EBE3', tint: '#8A5A2B' },
};

function formatDate(timestamp: Report['createdAt']): string {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReportReviewCard({ report, onViewDetails, onApprove, onReject }: ReportReviewCardProps) {
  const disaster = DISASTER_CONFIG[report.disasterType];
  const thumbnailUri = report.photoUrls && report.photoUrls.length > 0 ? report.photoUrls[0] : report.photoUrl;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{report.referenceNumber}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.mainColumn}>
          <View style={styles.typeRow}>
            <View style={[styles.typeIcon, { backgroundColor: disaster.bg }]}>
              <Ionicons name={disaster.icon} size={18} color={disaster.tint} />
            </View>
            <Text style={styles.typeLabel}>{disaster.label}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{report.affectedArea}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(report.createdAt)}</Text>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {report.description}
          </Text>
        </View>

        {thumbnailUri && <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />}
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.detailsButton} activeOpacity={0.8} onPress={onViewDetails}>
        <Text style={styles.detailsButtonText}>View Details</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.approveButton} activeOpacity={0.8} onPress={onApprove}>
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} activeOpacity={0.8} onPress={onReject}>
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  pendingBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D68910',
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mainColumn: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  description: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E3EFEC',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginBottom: 12,
  },
  detailsButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3D4D2',
  },
  rejectButtonText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
