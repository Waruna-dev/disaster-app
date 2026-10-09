import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { buildWarningsMapHtml, WarningMapItem } from '../utils/warningsMapHtml';

const RISK_LEGEND: { level: RiskLevel; color: string }[] = [
  { level: 'LOW', color: '#2E75D6' },
  { level: 'MEDIUM', color: '#EAB308' },
  { level: 'HIGH', color: Colors.warning },
  { level: 'CRITICAL', color: Colors.danger },
];

interface WarningsMapModalProps {
  visible: boolean;
  warnings: WarningMapItem[];
  onClose: () => void;
  onEditWarning: (id: string) => void;
}

/**
 * "All Warnings" full-screen map for the Public Warnings list — every warning
 * currently shown by the list's Active/All filter, plotted together (see
 * utils/warningsMapHtml.ts) so an officer can see the disaster picture at a
 * glance instead of scrolling cards one at a time. Tapping a zone's popup jumps
 * straight into editing that warning (app/(DMC)/create-alert.tsx's edit mode).
 */
export function WarningsMapModal({ visible, warnings, onClose, onEditWarning }: WarningsMapModalProps) {
  const insets = useSafeAreaInsets();

  const mapHtml = useMemo(() => buildWarningsMapHtml(warnings), [warnings]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'editWarning' && data.id) {
        onEditWarning(data.id);
      }
    } catch {
      // ignore malformed messages from the map page
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>All Warnings</Text>
            <Text style={styles.headerSubtitle}>{warnings.length} zone{warnings.length === 1 ? '' : 's'} on map</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.mapWrap}>
          {warnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No warnings to show on the map.</Text>
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
            {RISK_LEGEND.map((item) => (
              <View key={item.level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.level}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.hint}>Tap a zone, then "Edit warning" to open it.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F2',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F9F7',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  mapWrap: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
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
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#EEF3F2',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
