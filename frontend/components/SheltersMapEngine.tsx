import React, { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../constants/colors';
import { Shelter } from '../types/shelter';
import { buildSheltersMapHtml } from '../utils/sheltersMapHtml';

export interface SheltersMapEngineProps {
  shelters: Shelter[];
  userLocation?: { latitude: number; longitude: number } | null;
  onShelterTap?: (shelterId: string) => void;
}

export interface SheltersMapEngineRef {
  centerOnLocation: (lat: number, lng: number) => void;
}

export const SheltersMapEngine = forwardRef<SheltersMapEngineRef, SheltersMapEngineProps>(
  ({ shelters, userLocation, onShelterTap }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Rebuilt only when the shelter list changes — the map itself pans/zooms independently.
    const mapHtml = useMemo(() => buildSheltersMapHtml(shelters, userLocation ?? undefined), [shelters]);

    useImperativeHandle(ref, () => ({
      centerOnLocation: (lat: number, lng: number) => {
        if (isMapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${lat}, ${lng}); true;`);
        }
      },
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          setIsMapReady(true);
          if (userLocation) {
            webViewRef.current?.injectJavaScript(
              `window.setUserLocation(${userLocation.latitude}, ${userLocation.longitude}); true;`
            );
          }
        } else if (data.type === 'shelterTap' && onShelterTap) {
          onShelterTap(data.id);
        }
      } catch {
        // ignore malformed bridge messages
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleMessage}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
