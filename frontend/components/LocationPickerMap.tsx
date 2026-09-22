import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RADIUS_PRESETS, RiskLevel } from '../types/alert';
import { buildWarningMapHtml, IncidentPin } from '../utils/warningMapHtml';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  riskLevel: RiskLevel;
  incidents?: IncidentPin[];
  onChangeLocation: (coords: { latitude: number; longitude: number }) => void;
  onChangeRadius: (radius: number) => void;
}

function formatRadius(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km` : `${meters} m`;
}

// The map picker for "Create Public Warning": a draggable pin with a radius
// circle around it, sat between Affected Area and Message so the officer can
// see exactly where the warning zone lands before saving. Renders via WebView
// + Leaflet (see utils/warningMapHtml.ts for why, not react-native-maps).
export function LocationPickerMap({
  latitude,
  longitude,
  radius,
  riskLevel,
  incidents = [],
  onChangeLocation,
  onChangeRadius,
}: LocationPickerMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);

  // Rebuilt only when the risk level (zone color) or incident set changes — a
  // rebuild reloads the WebView and resets pan/zoom, so lat/lng/radius updates
  // instead go through injectJavaScript below to keep the map steady.
  const mapHtml = useMemo(
    () => buildWarningMapHtml(latitude, longitude, radius, riskLevel, incidents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [riskLevel, incidents]
  );

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`window.setRadius && window.setRadius(${radius}); true;`);
  }, [radius]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`window.setLocation && window.setLocation(${latitude}, ${longitude}); true;`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

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

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <WebView
          ref={webViewRef}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleMessage}
        />

        <TouchableOpacity style={styles.locateButton} activeOpacity={0.8} onPress={handleLocateMe} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={18} color={Colors.primary} />}
        </TouchableOpacity>

        <View style={styles.radiusBadge}>
          <Ionicons name="radio-button-on" size={10} color={Colors.white} />
          <Text style={styles.radiusBadgeText}>{formatRadius(radius)} radius</Text>
        </View>
      </View>

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
      <Text style={styles.hint}>Tap the map or drag the pin to move the warning zone.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  locateButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
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
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20,61,57,0.75)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  radiusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.white,
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
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
