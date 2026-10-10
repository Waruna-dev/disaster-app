import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RADIUS_PRESETS, RiskLevel } from '../types/alert';
import { DisasterType } from '../types/report';
import { buildWarningMapHtml, ExistingWarningZone, IncidentPin } from '../utils/warningMapHtml';

function formatRadius(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km` : `${meters} m`;
}

interface CircleZoneFullScreenModalProps {
  visible: boolean;
  latitude: number;
  longitude: number;
  radius: number;
  riskLevel: RiskLevel;
  hazardType: DisasterType;
  incidents?: IncidentPin[];
  existingWarnings?: ExistingWarningZone[];
  onChangeLocation: (coords: { latitude: number; longitude: number }) => void;
  onChangeRadius: (radius: number) => void;
  onClose: () => void;
}

/**
 * Full-screen version of LocationPickerMap's circle picker — same drag-pin +
 * radius interaction as the inline card (utils/warningMapHtml.ts), just at full
 * device size for precise placement. Unlike PolygonCreatorModal there's nothing
 * to discard on close: every change already flows live through
 * onChangeLocation/onChangeRadius exactly like the inline map does, so this is
 * purely a bigger view onto the same state, not a separate draft.
 */
export function CircleZoneFullScreenModal({
  visible,
  latitude,
  longitude,
  radius,
  riskLevel,
  hazardType,
  incidents = [],
  existingWarnings = [],
  onChangeLocation,
  onChangeRadius,
  onClose,
}: CircleZoneFullScreenModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);

  const mapHtml = useMemo(
    () => buildWarningMapHtml(latitude, longitude, radius, riskLevel, hazardType, incidents, null, existingWarnings, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [riskLevel, hazardType, incidents, existingWarnings]
  );

  useEffect(() => {
    if (!visible) return;
    webViewRef.current?.injectJavaScript(`window.setRadius && window.setRadius(${radius}); true;`);
  }, [radius, visible]);

  useEffect(() => {
    if (!visible) return;
    webViewRef.current?.injectJavaScript(`window.setLocation && window.setLocation(${latitude}, ${longitude}); true;`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, visible]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationChange') {
        onChangeLocation({ latitude: data.lat, longitude: data.lng });
      }
    } catch {
      // ignore malformed messages from the map page
    }
  };

  const handleLocateMe = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onChangeLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      // Leave the pin where it was if location can't be fetched.
    } finally {
      setLocating(false);
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
          <Text style={styles.headerTitle}>Warning Zone</Text>
          <TouchableOpacity style={styles.doneButton} activeOpacity={0.8} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          <WebView
            ref={webViewRef}
            style={StyleSheet.absoluteFill}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={handleMessage}
          />

          <TouchableOpacity style={styles.locateButton} activeOpacity={0.8} onPress={handleLocateMe} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={20} color={Colors.primary} />}
          </TouchableOpacity>

          <View style={styles.radiusBadge}>
            <Ionicons name="radio-button-on" size={11} color={Colors.white} />
            <Text style={styles.radiusBadgeText}>{formatRadius(radius)} radius</Text>
          </View>
        </View>

        <View style={[styles.toolbar, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.hint}>Tap the map or drag the pin to move the warning zone.</Text>
          <View style={styles.presetRow}>
            {RADIUS_PRESETS.map((preset) => {
              const active = preset === radius;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  activeOpacity={0.7}
                  onPress={() => onChangeRadius(preset)}
                >
                  <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{formatRadius(preset)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  mapWrap: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  radiusBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20,61,57,0.75)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radiusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: '#EEF3F2',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F9F7',
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  presetLabelActive: {
    color: Colors.white,
  },
});
