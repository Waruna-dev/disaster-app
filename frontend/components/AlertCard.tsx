import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useTranslation } from 'react-i18next';
import type { NearbyWarning } from '../hooks/useNearbyWarnings';

const SEVERITY: Record<string, { bar: string; bg: string; text: string; label: string }> = {
  HIGH: { bar: '#E74C3C', bg: '#FDEDEC', text: '#C0392B', label: 'HIGH' },
  MEDIUM: { bar: '#F39C12', bg: '#FEF5E7', text: '#D68910', label: 'MEDIUM' },
  LOW: { bar: '#27AE60', bg: '#E9F7EF', text: '#1E8449', label: 'LOW' },
};

function timeAgo(ms: number | null): string {
  if (!ms) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toLocaleString() : '—');

function fmtDistance(m: number | null): string {
  if (m === null) return '';
  return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

interface Props {
  warning?: NearbyWarning; // if not given, the original static card is shown
  style?: ViewStyle;
}

export function AlertCard({ warning, style }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // ---------- Live alert from Firestore ----------
  if (warning) {
    const sev = SEVERITY[String(warning.riskLevel).toUpperCase()] ?? SEVERITY.MEDIUM;
    const distance = fmtDistance(warning.distanceM);
    const hazard = String(warning.hazardType || 'hazard').toUpperCase();

    return (
      <>
        <View style={[styles.card, style]}>
          <View style={[styles.borderLeft, { backgroundColor: sev.bar }]} />
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>{t('alertCard.verified')}</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
              </View>
            </View>

            <Text style={styles.title}>{warning.title}</Text>
            <Text style={styles.location}>
              {warning.affectedArea}
              {distance ? `  •  ${distance}` : ''}
            </Text>

            <View style={styles.footer}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.timestamp}>{timeAgo(warning.createdAtMs)}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} style={{ flexShrink: 0 }} onPress={() => setOpen(true)}>
                <Text style={styles.viewDetails}>{t('alertCard.viewDetails')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Details sheet */}
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.severityText, { color: sev.text }]}>
                    {sev.label} RISK • {hazard}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={26} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{warning.title}</Text>
                <Text style={styles.location}>{warning.affectedArea}</Text>

                <View style={styles.messageBox}>
                  <Text style={styles.messageLabel}>What you should do</Text>
                  <Text style={styles.messageText}>{warning.message}</Text>
                </View>

                {distance ? <Row label="Distance from you" value={distance.replace(' away', '')} /> : null}
                <Row label="Affected radius" value={`${warning.radius} m`} />
                <Row label="Issued" value={`${fmtDate(warning.createdAtMs)} (${timeAgo(warning.createdAtMs)})`} />
                <Row label="Expires" value={fmtDate(warning.expiresAtMs)} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ---------- Original static card (unchanged behaviour) ----------
  return (
    <View style={[styles.card, style]}>
      <View style={styles.borderLeft} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.verifiedText}>{t('alertCard.verified')}</Text>
          </View>
          <View style={styles.severityBadge}>
            <Text style={styles.severityText}>{t('alertCard.moderate')}</Text>
          </View>
        </View>

        <Text style={styles.title}>{t('alertCard.floodWarning')}</Text>
        <Text style={styles.location}>{t('alertCard.location')}</Text>

        <View style={styles.footer}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.timestamp}>{t('alertCard.updatedTime')}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={{ flexShrink: 0 }}>
            <Text style={styles.viewDetails}>{t('alertCard.viewDetails')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Shown when there are no alerts for the user's area (or while loading)
export function NoAlertsCard({ message, style }: { message: string; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.borderLeft, { backgroundColor: '#27AE60' }]} />
      <View style={[styles.content, { flexDirection: 'row', alignItems: 'center' }]}>
        <Ionicons name="shield-checkmark" size={28} color="#27AE60" />
        <Text style={[styles.location, { marginBottom: 0, marginLeft: 12, flex: 1 }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: -40, // overlap the header wave
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  borderLeft: {
    width: 6,
    backgroundColor: '#F39C12', // Orange for moderate
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 1,
  },
  verifiedText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  severityBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 1,
  },
  severityText: {
    color: '#D68910',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  // ----- details sheet -----
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textDark,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
  },
  rowLabel: { fontSize: 14, color: Colors.textLight },
  rowValue: { fontSize: 14, fontWeight: '600', color: Colors.textDark, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
});
