import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { Colors } from '../../../constants/colors';
import { useUserFloodUpdates } from '../../../hooks/useUserFloodUpdates';
import { getFloodStatus, fetchFloodHistory } from '../../../services/floodService';
import { getRelativeTimeString } from '../../../utils/floodFormatting';
import { calculateLast24HourRainfall, normalizeStationName } from '../../../utils/floodCalculations';
import { FloodStatus, FloodReading } from '../../../types/flood';

const STATUS_THEME: Record<
  FloodStatus,
  { labelKey: string; color: string; background: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  normal: {
    labelKey: 'riverUpdate.normal',
    color: Colors.primary,
    background: '#E4F4EF',
    icon: 'checkmark',
  },
  alert: {
    labelKey: 'riverUpdate.alert',
    color: '#B66A00',
    background: '#FFF2D8',
    icon: 'alert',
  },
  minor: {
    labelKey: 'riverUpdate.minorFlood',
    color: '#8A6900',
    background: '#FFF7D6',
    icon: 'warning',
  },
  major: {
    labelKey: 'riverUpdate.majorFlood',
    color: Colors.danger,
    background: '#FDE7E7',
    icon: 'warning',
  },
  unknown: {
    labelKey: 'riverUpdate.notReported',
    color: '#667773',
    background: '#EEF2F1',
    icon: 'help',
  },
};

function getMeaning(status: FloodStatus) {
  switch (status) {
    case 'normal':
      return {
        titleKey: 'riverUpdate.noWarning',
        descriptionKey: 'riverUpdate.continueCheck',
        noteKey: 'riverUpdate.conditionsChange',
      };
    case 'alert':
      return {
        titleKey: 'riverUpdate.aboveAlert',
        descriptionKey: 'riverUpdate.stayAware',
        noteKey: 'riverUpdate.avoidRiverbanks',
      };
    case 'minor':
      return {
        titleKey: 'riverUpdate.minorFlood',
        descriptionKey: 'riverUpdate.waterRising',
        noteKey: 'riverUpdate.bePrepared',
      };
    case 'major':
      return {
        titleKey: 'riverUpdate.majorFlood',
        descriptionKey: 'riverUpdate.majorFlooding',
        noteKey: 'riverUpdate.evacuateNow',
      };
    default:
      return {
        titleKey: 'riverUpdate.notReported',
        descriptionKey: 'riverUpdate.notReported',
        noteKey: 'riverUpdate.notReported',
      };
  }
}

function formatLevel(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(2);
}

import { useTranslation } from 'react-i18next';

export default function RiverUpdateDetailsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { station } = useLocalSearchParams<{ station?: string }>();
  const { stations, latestByStation, refreshing, refresh, cached } = useUserFloodUpdates();

  const [selectedStationName, setSelectedStationName] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [meterWidth, setMeterWidth] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [history, setHistory] = useState<FloodReading[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyCache = useRef<Record<string, FloodReading[]>>({});

  // Initialize selected station priority
  useEffect(() => {
    if (!stations.length) return;
    
    // 1. Route param
    if (station) {
      const normParam = normalizeStationName(station as string);
      const matched = stations.find(s => normalizeStationName(s.station) === normParam);
      if (matched) {
        setSelectedStationName(matched.station);
        return;
      }
    }
    
    // 2. Previously selected (already handled by state)
    if (selectedStationName && stations.some(s => s.station === selectedStationName)) {
      return;
    }
    
    // 3. 'Hanwella'
    const normHanwella = normalizeStationName('Hanwella');
    const hanwellaMatch = stations.find(s => normalizeStationName(s.station) === normHanwella);
    if (hanwellaMatch) {
      setSelectedStationName(hanwellaMatch.station);
      return;
    }
    
    // 4. First station with valid reading
    const stationWithReading = stations.find(s => latestByStation[s.station]);
    if (stationWithReading) {
      setSelectedStationName(stationWithReading.station);
      return;
    }
    
    // 5. First available station
    setSelectedStationName(stations[0].station);
  }, [stations, station, latestByStation]);

  const selectedStation = useMemo(() => {
    if (!stations.length) return null;
    return stations.find(s => s.station === selectedStationName) ?? stations[0];
  }, [stations, selectedStationName]);

  const reading = selectedStation ? latestByStation[selectedStation.station] : null;

  const currentStatus = useMemo(() => {
    if (!selectedStation) return 'unknown';
    return getFloodStatus(
      reading?.waterLevel,
      selectedStation.alertLevel,
      selectedStation.minorFloodLevel,
      selectedStation.majorFloodLevel
    );
  }, [selectedStation, reading]);

  const theme = STATUS_THEME[currentStatus];
  const meaning = getMeaning(currentStatus);
  const timeStr = getRelativeTimeString(reading?.timestamp);

  const levelProgress = useMemo(() => {
    if (
      reading?.waterLevel == null ||
      selectedStation?.majorFloodLevel == null ||
      selectedStation.majorFloodLevel <= 0
    ) {
      return 0;
    }

    return Math.min(
      Math.max(reading.waterLevel / selectedStation.majorFloodLevel, 0),
      1
    );
  }, [selectedStation, reading]);

  const markerLeft = Math.max(
    0,
    Math.min(meterWidth - 18, meterWidth * levelProgress - 9)
  );

  // Fetch history for the selected station
  useEffect(() => {
    if (!selectedStation) return;
    let cancelled = false;

    async function loadHistory() {
      const norm = normalizeStationName(selectedStation!.station);
      if (historyCache.current[norm]) {
        setHistory(historyCache.current[norm]);
      } else {
        setHistoryLoading(true);
      }

      try {
        const points = await fetchFloodHistory(selectedStation!.station);
        if (!cancelled) {
          historyCache.current[norm] = points;
          setHistory(points);
        }
      } catch {
        // keep cached history if available
        if (!cancelled && !historyCache.current[norm]) {
          setHistory([]);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedStation?.station]);

  const handleRefresh = async () => {
    await refresh();
    
    // Refresh history
    if (selectedStation) {
      setHistoryLoading(true);
      try {
        const points = await fetchFloodHistory(selectedStation.station);
        historyCache.current[normalizeStationName(selectedStation.station)] = points;
        setHistory(points);
      } catch {
        // ignore history fetch error on refresh
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const rainfall24h = useMemo(() => {
    if (!selectedStation) return null;
    return calculateLast24HourRainfall(history, selectedStation.station);
  }, [history, selectedStation]);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [-50, 0, 100],
    extrapolate: 'clamp',
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  if (!selectedStation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stickyBar}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
        <View style={[styles.stickyBarContent, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={Colors.white} />
          </TouchableOpacity>

          <Animated.View style={[styles.stickyTitleContainer, { opacity: headerBgOpacity }]}>
            <Text style={styles.stickyTitle}>{t('riverUpdate.title')}</Text>
          </Animated.View>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.8}
            onPress={handleRefresh}
            disabled={refreshing}
            accessibilityLabel="Refresh river information"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="refresh" size={23} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor={Colors.primary}
            colors={[Colors.primary]} 
          />
        }
      >
        <View style={[styles.header, { height: 184 + insets.top }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: headerTranslateY }] }]}>
            <Svg
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 430 ${190 + insets.top}`}
              preserveAspectRatio="none"
            >
              <Defs>
                <SvgLinearGradient
                  id="riverHeader"
                  x1="0"
                  y1="0"
                  x2="430"
                  y2="190"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={Colors.gradientStart} />
                  <Stop offset="1" stopColor={Colors.gradientEnd} />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={`M0 0H430V${157 + insets.top}C350 ${179 + insets.top} 285 ${175 + insets.top} 218 ${157 + insets.top}C149 ${138 + insets.top} 83 ${140 + insets.top} 0 ${170 + insets.top}V0Z`}
                fill="url(#riverHeader)"
              />
              <Circle cx="427" cy="38" r="86" fill={Colors.white} opacity={0.035} />
              <Circle
                cx="427"
                cy="38"
                r="57"
                fill="none"
                stroke={Colors.white}
                strokeWidth={18}
                opacity={0.04}
              />
            </Svg>
          </Animated.View>

          <View style={[styles.headerContent, { paddingTop: insets.top + 16 }]}>
            <View style={{ width: 42, height: 42 }} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{t('riverUpdate.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('riverUpdate.officialInfo')}</Text>
            </View>
            <View style={{ width: 42, height: 42 }} />
          </View>
        </View>

        <View style={styles.cardsWrapper}>
          <TouchableOpacity
          style={styles.stationSelector}
          activeOpacity={0.85}
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Selected gauge station ${selectedStation.station}. Double tap to change station.`}
        >
          <View style={styles.stationSelectorTopRow}>
            <Text style={styles.inputLabel}>{t('riverUpdate.selectStation')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.background }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.color }]} />
              <Text style={[styles.statusBadgeText, { color: theme.color }]}>
                {t(theme.labelKey).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.stationSelectorMainRow}>
            <View style={styles.riverIconCircle}>
              <Ionicons name="water-outline" size={26} color={Colors.primary} />
            </View>
            <View style={styles.stationSelectorText}>
              <Text style={styles.stationName}>{selectedStation.station}</Text>
              <Text style={styles.basinName}>{selectedStation.basin}</Text>
            </View>
            <Ionicons name="chevron-down" size={23} color="#7A918D" />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('riverUpdate.currentWaterLevel')}</Text>
        <View style={styles.card}>
          <View style={styles.levelHeaderRow}>
            <View style={styles.levelValueRow}>
              <Text style={styles.levelValue}>{formatLevel(reading?.waterLevel)}</Text>
              {reading?.waterLevel != null ? (
                <Text style={styles.levelUnit}>m</Text>
              ) : null}
            </View>

            <View style={[styles.safeLevelBadge, { backgroundColor: theme.background }]}>
              <Ionicons name={theme.icon} size={19} color={theme.color} />
              <Text style={[styles.safeLevelText, { color: theme.color }]}>
                {t(theme.labelKey)}
              </Text>
            </View>
          </View>

          <Text style={styles.updatedText}>
            {t('riverUpdate.latestReading')} • {timeStr.toLowerCase()}
          </Text>

          <View style={styles.meterTitleRow}>
            <Text style={styles.meterTitle}>{t('riverUpdate.riverLevel')}</Text>
            <Text style={styles.meterHint}>
              {selectedStation.alertLevel == null
                ? 'Alert threshold unavailable'
                : t('riverUpdate.alertBegins', { level: selectedStation.alertLevel.toFixed(1) })}
            </Text>
          </View>

          {selectedStation.alertLevel == null && selectedStation.minorFloodLevel == null && selectedStation.majorFloodLevel == null ? (
            <Text style={{color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 12}}>Threshold information is unavailable.</Text>
          ) : (
            <>
              <View
                style={styles.meterTrack}
                onLayout={(event) => setMeterWidth(event.nativeEvent.layout.width)}
              >
                <View style={[styles.meterSegment, styles.safeSegment]} />
                <View style={[styles.meterSegment, styles.alertSegment]} />
                <View style={[styles.meterSegment, styles.riskSegment]} />
                {reading?.waterLevel != null && meterWidth > 0 ? (
                  <View style={[styles.meterMarker, { left: markerLeft }]} />
                ) : null}
              </View>

              <View style={styles.meterLabelsRow}>
                <Text style={styles.safeLabel}>{t('riverUpdate.safe')}</Text>
                <Text style={styles.alertLabel}>{t('riverUpdate.alert')}</Text>
                <Text style={styles.riskLabel}>{t('riverUpdate.floodRisk')}</Text>
              </View>
            </>
          )}

          <View style={[styles.summaryStrip, { backgroundColor: theme.background }]}>
            <View style={[styles.summaryDot, { backgroundColor: theme.color }]} />
            <Text style={styles.summaryText} numberOfLines={2}>
              {currentStatus === 'normal'
                ? t('riverUpdate.belowAlert')
                : t(meaning.titleKey as any)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('riverUpdate.whatThisMeans')}</Text>
        <View style={styles.meaningCard}>
          <View style={[styles.meaningIcon, { backgroundColor: theme.background }]}>
            <Ionicons name={theme.icon} size={27} color={theme.color} />
          </View>
          <View style={styles.meaningTextContainer}>
            <Text style={styles.meaningTitle}>{t(meaning.titleKey as any)}</Text>
            <Text style={styles.meaningDescription}>{t(meaning.descriptionKey as any)}</Text>
            <Text style={styles.meaningNote}>{t(meaning.noteKey as any)}</Text>
          </View>
        </View>

        <View style={styles.infoCardsRow}>
          <View style={[styles.infoCard, styles.rainfallCard]}>
            <View style={styles.rainIconCircle}>
              <Ionicons name="rainy-outline" size={24} color="#2D73D5" />
            </View>
            <View style={styles.infoCardText}>
              <Text style={[styles.rainfallValue, historyLoading && styles.rainfallLoadingText]}>
                {historyLoading ? 'Loading...' : rainfall24h == null ? t('riverUpdate.notReported') : `${rainfall24h.toFixed(1)} mm`}
              </Text>
              <Text style={styles.infoCardLabel}>{t('riverUpdate.rainfall24h')}</Text>
              <Text style={styles.infoCardHint}>
                {historyLoading ? 'Loading rainfall…' : rainfall24h == null ? (history.length > 0 ? 'Showing the last available rainfall data' : 'Rainfall information is currently unavailable') : rainfall24h === 0 ? 'No rainfall recorded in the available readings' : t('riverUpdate.calculatedFrom')}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.timeIconCircle}>
              <Ionicons name="time-outline" size={25} color={Colors.primary} />
            </View>
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>{t('riverUpdate.lastUpdate')}</Text>
              <Text style={styles.infoCardLabel}>{timeStr}</Text>
              <Text style={styles.infoCardHint}>{t('riverUpdate.pullToRefresh')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyIconCircle}>
            <Ionicons name="alert" size={22} color="#B66A00" />
          </View>
          <View style={styles.safetyTextContainer}>
            <Text style={styles.safetyTitle}>{t('riverUpdate.stayAware')}</Text>
            <Text style={styles.safetyDescription}>
              {t('riverUpdate.avoidRiverbanks')}
            </Text>
          </View>
        </View>

        <View style={styles.sourceRow}>
          <View style={styles.sourceIconCircle}>
            <Text style={styles.sourceIconText}>i</Text>
          </View>
          <View style={styles.sourceTextContainer}>
            <Text style={styles.sourceText}>{t('riverUpdate.sourceText')}</Text>
          </View>
        </View>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
            accessibilityLabel="Close station selector"
          />

          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>{t('riverUpdate.selectStation')}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPickerVisible(false)}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stations}
              keyExtractor={(item) => item.station}
              style={styles.stationList}
              renderItem={({ item }) => {
                const itemReading = latestByStation[item.station];
                const itemStatus = getFloodStatus(
                  itemReading?.waterLevel,
                  item.alertLevel,
                  item.minorFloodLevel,
                  item.majorFloodLevel
                );
                const itemTheme = STATUS_THEME[itemStatus];
                const selected = item.station === selectedStation.station;

                return (
                  <TouchableOpacity
                    style={[styles.stationRow, selected && styles.stationRowSelected]}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedStationName(item.station);
                      setPickerVisible(false);
                    }}
                  >
                    <View style={[styles.stationStatusDot, { backgroundColor: itemTheme.color }]} />
                    <View style={styles.stationRowText}>
                      <Text style={[styles.stationRowTitle, selected && styles.stationRowTitleSelected]}>
                        {item.station}
                      </Text>
                      <Text style={styles.stationRowSubtitle}>{item.basin}</Text>
                    </View>
                    <Text style={[styles.stationRowStatus, { color: itemTheme.color }]}>
                      {t(itemTheme.labelKey)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={21} color={Colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#A0B0AC" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
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
  header: {
    position: 'relative',
    overflow: 'hidden',
  },
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  stickyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  stickyTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stickyTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 23,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#DDF4EE',
    fontSize: 12.5,
    marginTop: 3,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardsWrapper: {
    paddingHorizontal: 20,
    marginTop: -47,
  },
  stationSelector: {
    minHeight: 104,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#D9E9E5',
    shadowColor: '#143D39',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  stationSelectorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: Colors.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  stationSelectorMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  riverIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F4EF',
    marginRight: 14,
  },
  stationSelectorText: {
    flex: 1,
  },
  stationName: {
    color: Colors.textDark,
    fontSize: 18,
    fontWeight: '800',
  },
  basinName: {
    color: Colors.textMuted,
    fontSize: 12.5,
    marginTop: 3,
  },
  sectionTitle: {
    color: Colors.textDark,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: Colors.white,
    shadowColor: '#143D39',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 3,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  levelValue: {
    color: Colors.textDark,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 54,
  },
  levelUnit: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
    marginBottom: 7,
  },
  safeLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  safeLevelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  updatedText: {
    color: Colors.textMuted,
    fontSize: 12.5,
    marginTop: 4,
  },
  meterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 12,
  },
  meterTitle: {
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  meterHint: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  meterTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'visible',
    flexDirection: 'row',
  },
  meterSegment: {
    height: 12,
  },
  safeSegment: {
    flex: 6,
    backgroundColor: '#77C7AF',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  alertSegment: {
    flex: 2,
    backgroundColor: '#F6D88E',
  },
  riskSegment: {
    flex: 2,
    backgroundColor: '#E4A2A2',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  meterMarker: {
    position: 'absolute',
    top: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.white,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  meterLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  safeLabel: {
    color: Colors.textMuted,
    fontSize: 10.5,
  },
  alertLabel: {
    color: '#B06A00',
    fontSize: 10.5,
  },
  riskLabel: {
    color: '#B32626',
    fontSize: 10.5,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 18,
  },
  summaryDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 9,
  },
  summaryText: {
    flex: 1,
    color: Colors.textDark,
    fontSize: 11.5,
    fontWeight: '700',
  },
  meaningCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    backgroundColor: Colors.white,
    shadowColor: '#143D39',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  meaningIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  meaningTextContainer: {
    flex: 1,
  },
  meaningTitle: {
    color: Colors.textDark,
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  meaningDescription: {
    color: Colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 5,
  },
  meaningNote: {
    color: '#91A39F',
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 3,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
  },
  infoCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    shadowColor: '#143D39',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  rainfallCard: {
    backgroundColor: '#EAF3FF',
  },
  rainIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginRight: 9,
  },
  timeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F4EF',
    marginRight: 9,
  },
  infoCardText: {
    flex: 1,
  },
  rainfallValue: {
    color: '#2D73D5',
    fontSize: 17,
    fontWeight: '900',
  },
  rainfallLoadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCardTitle: {
    color: Colors.textDark,
    fontSize: 14,
    fontWeight: '800',
  },
  infoCardLabel: {
    color: Colors.textMuted,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },
  infoCardHint: {
    color: '#91A39F',
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    padding: 14,
    marginTop: 18,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F4D79E',
  },
  safetyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8B7',
    marginRight: 12,
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    color: '#7E4C00',
    fontSize: 12,
    fontWeight: '800',
  },
  safetyDescription: {
    color: '#9A671F',
    fontSize: 10.5,
    marginTop: 3,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    marginTop: 15,
  },
  sourceIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2EE',
    marginRight: 8,
  },
  sourceIconText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  sourceTextContainer: {
    flex: 1,
  },
  sourceText: {
    color: Colors.textMuted,
    fontSize: 9.7,
  },
  sourceSubtext: {
    color: '#91A39F',
    fontSize: 8.8,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 43, 39, 0.46)',
  },
  pickerSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
  },
  pickerHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    backgroundColor: '#D3DEDB',
    marginBottom: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    color: Colors.textDark,
    fontSize: 20,
    fontWeight: '800',
  },
  pickerSubtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F6F4',
  },
  stationList: {
    marginTop: 4,
  },
  stationRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EFED',
    paddingHorizontal: 10,
  },
  stationRowSelected: {
    backgroundColor: '#F0F8F5',
    borderRadius: 13,
    borderBottomColor: 'transparent',
  },
  stationStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  stationRowText: {
    flex: 1,
  },
  stationRowTitle: {
    color: Colors.textDark,
    fontSize: 14,
    fontWeight: '700',
  },
  stationRowTitleSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  stationRowSubtitle: {
    color: Colors.textMuted,
    fontSize: 10.5,
    marginTop: 3,
  },
  stationRowStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginRight: 8,
  },
});
