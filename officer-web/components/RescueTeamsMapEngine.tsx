import React, { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '../constants/colors';
import { RescueTeam } from '../types/rescueTeam';
import { buildRescueTeamsMapHtml } from '../utils/rescueTeamsMapHtml';

export interface RescueTeamsMapEngineProps {
  teams: RescueTeam[];
  userLocation?: { latitude: number; longitude: number } | null;
  onTeamTap?: (teamId: string) => void;
}

export interface RescueTeamsMapEngineRef {
  centerOnLocation: (lat: number, lng: number) => void;
}

export const RescueTeamsMapEngine = forwardRef<RescueTeamsMapEngineRef, RescueTeamsMapEngineProps>(
  ({ teams, userLocation, onTeamTap }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    const mapHtml = useMemo(() => buildRescueTeamsMapHtml(teams, userLocation ?? undefined), [teams]);

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
        } else if (data.type === 'teamTap' && onTeamTap) {
          onTeamTap(data.id);
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
