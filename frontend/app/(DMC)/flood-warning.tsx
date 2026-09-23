import React, { useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { StatTile } from '../../components/StatTile';
import { FloodLevelChart } from '../../components/FloodLevelChart';
import { useFloodData } from '../../hooks/useFloodData';
import { getFloodStatus } from '../../services/floodService';
import { calculateLast24HourRainfall } from '../../utils/floodCalculations';
import { FloodStatus } from '../../types/flood';

const STATUS_CONFIG: Record<FloodStatus, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: Colors.primary, bg: '#E8F5F2' },
  alert: { label: 'Alert', color: Colors.warning, bg: '#FEF5E7' },
  minor: { label: 'Minor Flood', color: '#EAB308', bg: '#FEF9E7' },
  major: { label: 'Major Flood', color: Colors.danger, bg: '#FDEDEC' },
  unknown: { label: 'Unknown', color: '#667773', bg: '#EEF2F1' },
};

function formatRelative(timestamp: number | undefined) {
  if (!timestamp) return 'No data';
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function FloodWarningScreen() {
  const {
    stations,
    latestByStation,
    selectedStation,
    setSelectedStation,
    history,
    loading,
    historyLoading,
    error,
    refresh,
  } = useFloodData();

  const [pickerVisible, setPickerVisible] = useState(false);
  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const station = useMemo(() => stations.find((s) => s.station === selectedStation) ?? null, [stations, selectedStation]);
  const latest = selectedStation ? latestByStation[selectedStation] : undefined;

  // Prefer the live reading's own thresholds, falling back to the static station
  // record — a station with no reading yet still shows its known danger levels.
  const alertLevel = latest?.alertLevel ?? station?.alertLevel ?? null;
  const minorFloodLevel = latest?.minorFloodLevel ?? station?.minorFloodLevel ?? null;
  const majorFloodLevel = latest?.majorFloodLevel ?? station?.majorFloodLevel ?? null;

  const status: FloodStatus | null = latest ? getFloodStatus(latest.waterLevel, alertLevel, minorFloodLevel, majorFloodLevel) : null;
  const statusConfig = status ? STATUS_CONFIG[status] : null;

  const chartPoints = history.map((r) => ({ timestamp: r.timestamp, waterLevel: r.waterLevel, rainFall: r.rainFall }));
  const chartTitle = `River Water at ${station?.station ?? selectedStation ?? ''} in m`;

  // Network-wide snapshot from each station's latest reading, independent of which
  // station is currently selected below.
  const statusCounts = useMemo(() => {
    const counts = { alert: 0, minor: 0, major: 0 };
    stations.forEach((s) => {
      const reading = latestByStation[s.station];
      if (!reading) return;
      const st = getFloodStatus(
        reading.waterLevel,
        reading.alertLevel ?? s.alertLevel,
        reading.minorFloodLevel ?? s.minorFloodLevel,
        reading.majorFloodLevel ?? s.majorFloodLevel
      );
      if (st === 'alert') counts.alert += 1;
      else if (st === 'minor') counts.minor += 1;
      else if (st === 'major') counts.major += 1;
    });
    return counts;
  }, [stations, latestByStation]);

  // Sum of the selected station's readings from the last 24 hours
  const rainfall24h = useMemo(() => {
    if (!selectedStation) return null;
    return calculateLast24HourRainfall(history, selectedStation);
  }, [history, selectedStation]);

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DMC · FLOOD WARNING" title="Flood Warning" scrollY={scrollY} onBack={() => router.back()} />

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 4 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        {loading && stations.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.8} onPress={refresh}>
              <Ionicons name="refresh" size={16} color={Colors.white} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <StatTile
                icon="notifications"
                value={String(statusCounts.alert)}
                label="Alert Stations"
                tint={Colors.warning}
                tintBg="#F0F7F4"
                iconColor="#C0C5C3"
                compact
              />
              <StatTile
                materialIcon="waves"
                value={String(statusCounts.minor)}
                label="Minor Flood"
                tint="#EAB308"
                tintBg="#FEF9E7"
                compact
              />
              <StatTile
                materialIcon="home-flood"
                value={String(statusCounts.major)}
                label="Major Flood"
                tint={Colors.danger}
                tintBg="#FDEDEC"
                compact
              />
            </View>

            <Text style={styles.sectionTitle}>GAUGE STATION</Text>
            <TouchableOpacity style={styles.filterButton} activeOpacity={0.8} onPress={() => setPickerVisible(true)}>
              <View style={styles.filterButtonLeft}>
                {status && status !== 'normal' && <View style={[styles.chipDot, { backgroundColor: STATUS_CONFIG[status].color }]} />}
                <Text style={styles.filterButtonText}>{station?.station ?? selectedStation ?? 'Select station'}</Text>
                {station?.basin && <Text style={styles.filterButtonBasin}>· {station.basin}</Text>}
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
              <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
                <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
                  <Text style={styles.pickerTitle}>Select Gauge Station</Text>
                  <ScrollView style={styles.pickerList}>
                    {stations.map((s) => {
                      const active = s.station === selectedStation;
                      const reading = latestByStation[s.station];
                      const stationStatus = reading
                        ? getFloodStatus(reading.waterLevel, reading.alertLevel ?? s.alertLevel, reading.minorFloodLevel ?? s.minorFloodLevel, reading.majorFloodLevel ?? s.majorFloodLevel)
                        : null;
                      return (
                        <TouchableOpacity
                          key={s.station}
                          style={styles.pickerRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedStation(s.station);
                            setPickerVisible(false);
                          }}
                        >
                          <View style={styles.pickerRowLeft}>
                            <View
                              style={[
                                styles.chipDot,
                                { backgroundColor: stationStatus && stationStatus !== 'normal' ? STATUS_CONFIG[stationStatus].color : '#D6E3E0' },
                              ]}
                            />
                            <View>
                              <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>{s.station}</Text>
                              <Text style={styles.pickerRowBasin}>{s.basin}</Text>
                            </View>
                          </View>
                          {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={styles.card}>
              <View style={styles.levelHeaderRow}>
                <View>
                  <Text style={styles.stationName}>{station?.station ?? selectedStation}</Text>
                  <Text style={styles.basinText}>{station?.basin ?? latest?.basin ?? ''}</Text>
                </View>
                {statusConfig && (
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.levelValueRow}>
                <Text style={styles.levelValue}>{latest ? latest.waterLevel.toFixed(2) : '—'}</Text>
                <Text style={styles.levelUnit}>m</Text>
              </View>
              <Text style={styles.levelSubtext}>Current water level · updated {formatRelative(latest?.timestamp)}</Text>

              <View style={styles.thresholdRow}>
                <ThresholdPill label="Alert" value={alertLevel} color={Colors.warning} />
                <ThresholdPill label="Minor" value={minorFloodLevel} color="#EAB308" />
                <ThresholdPill label="Major" value={majorFloodLevel} color={Colors.danger} />
              </View>
            </View>

            {historyLoading && history.length === 0 ? (
              <View style={[styles.card, styles.chartLoading]}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.chartWrapper}>
                <FloodLevelChart
                  title={chartTitle}
                  points={chartPoints}
                  alertLevel={alertLevel}
                  minorFloodLevel={minorFloodLevel}
                  majorFloodLevel={majorFloodLevel}
                />
              </View>
            )}

            <View style={styles.rainfallCardRow}>
              <StatTile
                materialIcon="weather-pouring"
                value={rainfall24h == null ? 'Not reported' : `${rainfall24h.toFixed(1)} mm`}
                label="Last 24 Hours Rainfall"
                tint="#2E75D6"
                tintBg="#E8F1FB"
                fullWidth
              />
            </View>

            <Text style={styles.sourceText}>Source: Sri Lanka Irrigation Department — real-time river gauge network</Text>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

function ThresholdPill({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={styles.thresholdPill}>
      <View style={[styles.thresholdDot, { backgroundColor: color }]} />
      <Text style={styles.thresholdLabel}>{label}</Text>
      <Text style={styles.thresholdValue}>{value != null ? `${value}m` : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  filterButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  filterButtonBasin: {
    fontSize: 12,
    color: Colors.textLight,
    flexShrink: 1,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,61,57,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
  },
  pickerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  pickerRowTextActive: {
    color: Colors.primary,
  },
  pickerRowBasin: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
  },
  basinText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  levelValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  levelValue: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textDark,
    lineHeight: 44,
  },
  levelUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  rainfallCardRow: {
    marginBottom: 16,
  },
  levelSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    marginBottom: 16,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thresholdPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  thresholdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thresholdLabel: {
    fontSize: 11,
    color: Colors.textLight,
    flex: 1,
  },
  thresholdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  chartWrapper: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  chartLoading: {
    marginHorizontal: -20,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
