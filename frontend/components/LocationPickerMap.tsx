import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RADIUS_PRESETS, RiskLevel, WarningLocation } from '../types/alert';
import { buildWarningMapHtml, ExistingWarningZone, IncidentPin } from '../utils/warningMapHtml';
import { computeCentroid } from '../utils/geo';
import { PolygonCreatorModal } from './PolygonCreatorModal';
import { CircleZoneFullScreenModal } from './CircleZoneFullScreenModal';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  riskLevel: RiskLevel;
  incidents?: IncidentPin[];
  polygon?: WarningLocation[] | null;
  existingWarnings?: ExistingWarningZone[];
  onChangeLocation: (coords: { latitude: number; longitude: number }) => void;
  onChangeRadius: (radius: number) => void;
  onChangePolygon?: (polygon: WarningLocation[] | null) => void;
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
  polygon = null,
  existingWarnings = [],
  onChangeLocation,
  onChangeRadius,
  onChangePolygon,
}: LocationPickerMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const [creatorVisible, setCreatorVisible] = useState(false);
  const [circleFullScreenVisible, setCircleFullScreenVisible] = useState(false);
  const hasPolygon = !!polygon && polygon.length >= 3;

  // The expand icon opens whichever full-screen editor matches the current mode:
  // the Polygon Creator when a boundary is already drawn, otherwise the same
  // circle picker at full device size.
  const handleExpand = () => (hasPolygon ? setCreatorVisible(true) : setCircleFullScreenVisible(true));

  // Rebuilt when the risk level (zone color), incident set, or the drawn polygon
  // itself changes — a rebuild reloads the WebView and resets pan/zoom, so plain
  // lat/lng/radius updates in circle mode instead go through injectJavaScript
  // below to keep the map steady.
  const mapHtml = useMemo(
    () => buildWarningMapHtml(latitude, longitude, radius, riskLevel, incidents, polygon, existingWarnings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [riskLevel, incidents, polygon, existingWarnings]
  );

  useEffect(() => {
    if (hasPolygon) return;
    webViewRef.current?.injectJavaScript(`window.setRadius && window.setRadius(${radius}); true;`);
  }, [radius, hasPolygon]);

  useEffect(() => {
    if (hasPolygon) return;
    webViewRef.current?.injectJavaScript(`window.setLocation && window.setLocation(${latitude}, ${longitude}); true;`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, hasPolygon]);

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

  const handlePolygonDone = (points: WarningLocation[]) => {
    setCreatorVisible(false);
    if (points.length < 3) return;
    onChangeLocation(computeCentroid(points));
    onChangePolygon?.(points);
  };

  const handleClearPolygon = () => onChangePolygon?.(null);

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

        {!hasPolygon && (
          <TouchableOpacity style={styles.locateButton} activeOpacity={0.8} onPress={handleLocateMe} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={18} color={Colors.primary} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.expandButton, !hasPolygon && styles.expandButtonBelowLocate]}
          activeOpacity={0.8}
          onPress={handleExpand}
        >
          <Ionicons name="expand" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.zoneInfoCard}>
        {hasPolygon ? (
          <>
            <Ionicons name="shapes-outline" size={14} color={Colors.primary} />
            <Text style={styles.zoneInfoText}>Custom boundary · {polygon!.length} points</Text>
          </>
        ) : (
          <>
            <Ionicons name="radio-button-on" size={12} color={Colors.primary} />
            <Text style={styles.zoneInfoText}>{formatRadius(radius)} radius</Text>
          </>
        )}
      </View>

      {onChangePolygon && (
        <View style={styles.polygonActionRow}>
          {hasPolygon ? (
            <>
              <TouchableOpacity style={styles.polygonButton} activeOpacity={0.7} onPress={() => setCreatorVisible(true)}>
                <Ionicons name="create-outline" size={15} color={Colors.primary} />
                <Text style={styles.polygonButtonText}>Edit boundary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.polygonButton} activeOpacity={0.7} onPress={handleClearPolygon}>
                <Ionicons name="close-circle-outline" size={15} color={Colors.danger} />
                <Text style={[styles.polygonButtonText, { color: Colors.danger }]}>Use circle instead</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.polygonButton} activeOpacity={0.7} onPress={() => setCreatorVisible(true)}>
              <Ionicons name="shapes-outline" size={15} color={Colors.primary} />
              <Text style={styles.polygonButtonText}>Draw custom disaster area (full screen)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!hasPolygon && (
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
      )}

      <Text style={styles.hint}>
        {hasPolygon ? 'Custom boundary drawn by the officer — edit it in full screen or switch back to a circle.' : 'Tap the map or drag the pin to move the warning zone.'}
        {existingWarnings.length > 0 ? ' Grey dashed areas are already-published warnings.' : ''}
      </Text>

      {onChangePolygon && (
        <PolygonCreatorModal
          visible={creatorVisible}
          centerLatitude={latitude}
          centerLongitude={longitude}
          riskLevel={riskLevel}
          initialPolygon={polygon}
          incidents={incidents}
          existingWarnings={existingWarnings}
          onCancel={() => setCreatorVisible(false)}
          onDone={handlePolygonDone}
        />
      )}

      <CircleZoneFullScreenModal
        visible={circleFullScreenVisible}
        latitude={latitude}
        longitude={longitude}
        radius={radius}
        riskLevel={riskLevel}
        incidents={incidents}
        existingWarnings={existingWarnings}
        onChangeLocation={onChangeLocation}
        onChangeRadius={onChangeRadius}
        onClose={() => setCircleFullScreenVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  // Bleeds edge-to-edge past the screen's usual 20px content padding (see
  // app/(DMC)/create-alert.tsx's `content` style) so the map reads as a full-width
  // hero section instead of an inset card — the -20 here is that padding, negated.
  mapWrap: {
    height: 240,
    marginHorizontal: -20,
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
  expandButton: {
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
  expandButtonBelowLocate: {
    top: 52,
  },
  polygonActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  polygonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  polygonButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  zoneInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3F0EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  zoneInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
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
