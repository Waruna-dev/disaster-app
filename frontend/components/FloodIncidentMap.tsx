import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { buildFloodIncidentMapHtml, FloodIncidentMapData } from '../utils/floodIncidentMapHtml';

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  LOW: { label: 'LOW', color: '#2E75D6', bg: 'rgba(232,241,251,0.95)' },
  MEDIUM: { label: 'MEDIUM', color: '#B7860B', bg: 'rgba(254,249,231,0.95)' },
  HIGH: { label: 'HIGH', color: Colors.warning, bg: 'rgba(254,245,231,0.95)' },
  CRITICAL: { label: 'CRITICAL', color: Colors.danger, bg: 'rgba(253,237,236,0.95)' },
};

interface FloodIncidentMapProps {
  data: FloodIncidentMapData;
  reportCount: number;
  onReportTap?: (id: string) => void;
  onExpand?: () => void;
}

/** Read-only OpenStreetMap map for one flood incident: 300m grouping circles, the affected-area polygon (or circle fallback), and a report/risk overlay. */
export function FloodIncidentMap({ data, reportCount, onReportTap, onExpand }: FloodIncidentMapProps) {
  const mapHtml = useMemo(() => buildFloodIncidentMapHtml(data), [data]);
  const risk = RISK_CONFIG[data.riskLevel];

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'reportTap' && parsed.id) onReportTap?.(parsed.id);
    } catch {
      // ignore malformed messages from the map page
    }
  };

  return (
    <View style={styles.wrap}>
      <WebView style={StyleSheet.absoluteFill} originWhitelist={['*']} source={{ html: mapHtml }} onMessage={handleMessage} />

      <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
        <Ionicons name="warning" size={13} color={risk.color} />
        <Text style={[styles.riskBadgeText, { color: risk.color }]}>Risk: {risk.label}</Text>
      </View>

      <View style={styles.countBadge}>
        <Ionicons name="location" size={12} color={Colors.white} />
        <Text style={styles.countBadgeText}>{reportCount} report{reportCount === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.legend}>
        <LegendRow color="#E4402F" label="Report" dot />
        <LegendRow color={risk.color} label="Affected area" fill />
        <LegendRow color={risk.color} label="Polygon boundary" outline />
      </View>

      {onExpand && (
        <TouchableOpacity style={styles.expandButton} activeOpacity={0.8} onPress={onExpand}>
          <Ionicons name="expand" size={16} color={Colors.textDark} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function LegendRow({
  color,
  label,
  dot,
  fill,
  outline,
}: {
  color: string;
  label: string;
  dot?: boolean;
  fill?: boolean;
  outline?: boolean;
}) {
  return (
    <View style={styles.legendRow}>
      {dot && <View style={[styles.legendDot, { backgroundColor: color }]} />}
      {fill && <View style={[styles.legendSwatch, { backgroundColor: color }]} />}
      {outline && <View style={[styles.legendOutlineDot, { borderColor: color }]} />}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#eef2f1',
  },
  riskBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendOutlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    opacity: 0.7,
  },
  legendLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
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
});
