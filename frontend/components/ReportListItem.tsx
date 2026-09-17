import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Report } from '../types/report';

interface ReportListItemProps {
  report: Report;
  onPress: () => void;
}

const DISASTER_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; tint: string }> = {
  flood: { icon: 'water', label: 'Flood', bg: '#E8F1FB', tint: '#2E75D6' },
  landslide: { icon: 'triangle', label: 'Landslide', bg: '#F1EBE3', tint: '#8A5A2B' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#FEF5E7', text: '#D68910' },
  Verified: { bg: '#E8F5F2', text: Colors.primary },
  Rejected: { bg: '#FDEDEC', text: Colors.danger },
};

function formatDate(timestamp: Report['createdAt']): string {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

// Read-only row for browsing reports of any status — unlike ReportReviewCard, this
// never shows Approve/Reject (those only make sense for Pending reports, reviewed
// from the Details screen or the Pending Reports queue).
export function ReportListItem({ report, onPress }: ReportListItemProps) {
  const disaster = DISASTER_CONFIG[report.disasterType];
  const status = STATUS_STYLES[report.status];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.typeIcon, { backgroundColor: disaster.bg }]}>
        <Ionicons name={disaster.icon} size={18} color={disaster.tint} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {disaster.label} · {report.affectedArea}
          </Text>
        </View>
        <Text style={styles.meta}>
          {report.referenceNumber} · {formatDate(report.createdAt)}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.text }]}>{report.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F5F4',
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  titleRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  meta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
