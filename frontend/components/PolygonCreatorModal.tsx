import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { RiskLevel } from '../types/alert';
import { buildPolygonDrawMapHtml } from '../utils/polygonDrawMapHtml';
import { ExistingWarningZone, IncidentPin } from '../utils/warningMapHtml';

interface PolygonPoint {
  latitude: number;
  longitude: number;
}

interface PolygonCreatorModalProps {
  visible: boolean;
  centerLatitude: number;
  centerLongitude: number;
  riskLevel: RiskLevel;
  initialPolygon?: PolygonPoint[] | null;
  incidents?: IncidentPin[];
  existingWarnings?: ExistingWarningZone[];
  onCancel: () => void;
  onDone: (points: PolygonPoint[]) => void;
}

const MIN_POINTS = 3;

/**
 * Full-screen "Polygon Creator": the space Create Public Warning's inline map is
 * too small for precise boundary drawing. Opened from LocationPickerMap, it hosts
 * the same tap-to-add-vertex Leaflet page (utils/polygonDrawMapHtml.ts) at full
 * device size with an undo/clear toolbar, and hands the finished ring back to the
 * caller on "Done" — it holds no Firestore/creation logic of its own.
 */
export function PolygonCreatorModal({
  visible,
  centerLatitude,
  centerLongitude,
  riskLevel,
  initialPolygon,
  incidents = [],
  existingWarnings = [],
  onCancel,
  onDone,
}: PolygonCreatorModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [points, setPoints] = useState<PolygonPoint[]>(initialPolygon ?? []);

  // Rebuilt each time the modal opens (this component stays mounted underneath
  // LocationPickerMap the whole time — only its JSX is gated by `visible` below —
  // so `[visible]` is what actually catches the rising edge; a `[]` dep here would
  // freeze the page on whatever centerLatitude/initialPolygon/existingWarnings
  // happened to be at the very first render, before Firestore's existingWarnings
  // snapshot had even arrived). Once open, further re-renders (e.g. from vertex
  // taps updating `points`) must NOT recompute this, or the WebView would reload
  // and wipe whatever the officer has drawn so far.
  const mapHtml = useMemo(
    () => buildPolygonDrawMapHtml(centerLatitude, centerLongitude, riskLevel, initialPolygon ?? [], incidents, existingWarnings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  // Mirrors the mapHtml rebuild above: this component never unmounts between
  // opens, so the point count/"Done" button would otherwise keep showing
  // whatever was left over from an abandoned previous session.
  useEffect(() => {
    if (visible) setPoints(initialPolygon ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'polygonChange') {
        setPoints(data.points.map((p: { lat: number; lng: number }) => ({ latitude: p.lat, longitude: p.lng })));
      }
    } catch {
      // ignore malformed messages from the map page
    }
  };

  const handleUndo = () => {
    webViewRef.current?.injectJavaScript('window.undoLastPoint && window.undoLastPoint(); true;');
  };

  const handleClear = () => {
    webViewRef.current?.injectJavaScript('window.clearPoints && window.clearPoints(); true;');
  };

  const canFinish = points.length >= MIN_POINTS;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.7} onPress={onCancel}>
            <Ionicons name="close" size={22} color={Colors.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Draw Disaster Area</Text>
            <Text style={styles.headerSubtitle}>{points.length} point{points.length === 1 ? '' : 's'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, !canFinish && styles.doneButtonDisabled]}
            activeOpacity={0.8}
            disabled={!canFinish}
            onPress={() => onDone(points)}
          >
            <Text style={[styles.doneButtonText, !canFinish && styles.doneButtonTextDisabled]}>Done</Text>
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
        </View>

        <View style={[styles.toolbar, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.hint}>
            {canFinish ? 'Tap to add more points, or drag a point to adjust the boundary.' : `Tap the map to place at least ${MIN_POINTS} points.`}
          </Text>
          <View style={styles.toolbarButtons}>
            <TouchableOpacity
              style={[styles.toolbarButton, points.length === 0 && styles.toolbarButtonDisabled]}
              activeOpacity={0.7}
              disabled={points.length === 0}
              onPress={handleUndo}
            >
              <Ionicons name="arrow-undo" size={16} color={points.length === 0 ? Colors.textMuted : Colors.textDark} />
              <Text style={[styles.toolbarButtonText, points.length === 0 && styles.toolbarButtonTextDisabled]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolbarButton, points.length === 0 && styles.toolbarButtonDisabled]}
              activeOpacity={0.7}
              disabled={points.length === 0}
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={16} color={points.length === 0 ? Colors.textMuted : Colors.danger} />
              <Text style={[styles.toolbarButtonText, points.length === 0 && styles.toolbarButtonTextDisabled, points.length > 0 && { color: Colors.danger }]}>
                Clear
              </Text>
            </TouchableOpacity>
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
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  doneButtonDisabled: {
    backgroundColor: '#E3F0EC',
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  doneButtonTextDisabled: {
    color: Colors.textMuted,
  },
  mapWrap: {
    flex: 1,
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
  toolbarButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  toolbarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F9F7',
  },
  toolbarButtonDisabled: {
    opacity: 0.6,
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  toolbarButtonTextDisabled: {
    color: Colors.textMuted,
  },
});
