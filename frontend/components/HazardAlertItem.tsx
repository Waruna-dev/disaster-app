import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useTranslation } from 'react-i18next';
import type { NearbyWarning } from '../hooks/useNearbyWarnings';

const SEVERITY: Record<string, { bar: string; bg: string; text: string; label: string }> = {
  HIGH: { bar: '#E74C3C', bg: '#FDEDEC', text: '#C0392B', label: 'HIGH RISK' },
  MEDIUM: { bar: '#F39C12', bg: '#FEF5E7', text: '#B9770E', label: 'MEDIUM RISK' },
  LOW: { bar: '#27AE60', bg: '#E9F7EF', text: '#1E8449', label: 'LOW RISK' },
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

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon as any} size={13} color={Colors.textLight} />
      <Text style={styles.chipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

export function HazardAlertItem({ warning }: { warning: NearbyWarning }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const compact = width < 360;
  const sev = SEVERITY[String(warning.riskLevel).toUpperCase()] ?? SEVERITY.MEDIUM;
  const isLandslide = String(warning.hazardType).toLowerCase() === 'landslide';
  const hazardLabel = isLandslide ? 'Landslide' : 'Flood';
  const hazardIcon = isLandslide ? 'earth' : 'water';
  const distance = fmtDistance(warning.distanceM);
  const ago = timeAgo(warning.createdAtMs);

  return (
    <View style={[styles.wrap, { paddingHorizontal: compact ? 12 : 16 }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} style={styles.card}>
        <View style={[styles.accent, { backgroundColor: sev.bar }]} />
        <View style={[styles.body, { padding: compact ? 12 : 16 }]}>
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: sev.bg }]}>
              <Ionicons name={hazardIcon as any} size={22} color={sev.text} />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={2}>
                {warning.title}
              </Text>
              <View style={styles.areaRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textLight} />
                <Text style={styles.area} numberOfLines={1}>
                  {warning.affectedArea}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: sev.bg }]}>
              <Text style={[styles.pillText, { color: sev.text }]}>{sev.label}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#EEF3F1' }]}>
              <Text style={[styles.pillText, { color: Colors.textDark }]}>{hazardLabel.toUpperCase()}</Text>
            </View>
          </View>

          {!!warning.message && (
            <Text style={styles.preview} numberOfLines={2}>
              {warning.message}
            </Text>
          )}

          <View style={styles.chipRow}>
            {!!distance && <Chip icon="navigate-outline" text={distance} />}
            {!!ago && <Chip icon="time-outline" text={ago} />}
          </View>

          <View style={styles.footer}>
            <Text style={styles.viewDetails}>{t('alertCard.viewDetails')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.pill, { backgroundColor: sev.bg }]}>
                <Text style={[styles.pillText, { color: sev.text }]}>
                  {sev.label} • {hazardLabel.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={styles.sheetTitle}>{warning.title}</Text>
              <View style={styles.areaRow}>
                <Ionicons name="location-outline" size={15} color={Colors.textLight} />
                <Text style={[styles.area, { fontSize: 15 }]}>{warning.affectedArea}</Text>
              </View>

              <View style={styles.messageBox}>
                <View style={styles.messageHeader}>
                  <Ionicons name="alert-circle" size={18} color={sev.text} />
                  <Text style={[styles.messageLabel, { color: sev.text }]}>What you should do</Text>
                </View>
                <Text style={styles.messageText}>{warning.message}</Text>
              </View>

              <View style={styles.tileGrid}>
                {!!distance && <InfoTile icon="navigate-outline" label="Distance" value={distance.replace(' away', '')} />}
                <InfoTile icon="radio-outline" label="Affected radius" value={`${warning.radius} m`} />
                <InfoTile icon="time-outline" label="Issued" value={ago || '—'} />
                <InfoTile icon="hourglass-outline" label="Expires" value={fmtDate(warning.expiresAtMs)} />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', marginTop: 12 },
  card: {
    width: '100%',
    maxWidth: 640,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF3F1',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  accent: { width: 5 },
  body: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  area: { flexShrink: 1, fontSize: 13, color: Colors.textLight },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  preview: { fontSize: 14, lineHeight: 20, color: Colors.textDark, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: '100%',
  },
  chipText: { fontSize: 12, color: Colors.textLight, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 },
  viewDetails: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginRight: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D8DEE2', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: Colors.textDark, marginBottom: 6 },
  messageBox: { backgroundColor: '#F5F7FA', borderRadius: 16, padding: 16, marginTop: 16 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  messageLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  messageText: { fontSize: 16, lineHeight: 24, color: Colors.textDark },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EEF3F1',
    borderRadius: 14,
    padding: 12,
  },
  tileLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  tileValue: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginTop: 2 },
  closeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  closeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
