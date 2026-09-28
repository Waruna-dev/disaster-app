import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { buildUserMapHtml } from '../utils/userMapHtml';
import { WarningZone } from '../utils/reportMap';
import { useTranslation } from 'react-i18next';

export type UserMapMode = 'report' | 'home';

export interface UserMapEngineProps {
  mode: UserMapMode;
  warnings?: WarningZone[];
  initialLocation?: { latitude: number; longitude: number };
  onLocationSelect?: (location: { latitude: number; longitude: number }, address: string, isResolving: boolean) => void;
  onReportTap?: (reportId: string) => void;
  locateMeButtonBottom?: number;
}

export interface UserMapEngineRef {
  centerOnLocation: (lat: number, lng: number) => void;
}

export const UserMapEngine = forwardRef<UserMapEngineRef, UserMapEngineProps>(
  ({ mode, warnings = [], initialLocation, onLocationSelect, onReportTap, locateMeButtonBottom = 280 }, ref) => {
    const { t } = useTranslation();
    const webViewRef = useRef<WebView>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // Initialize HTML
    const mapHtml = useMemo(() => buildUserMapHtml([], []), []);

    useImperativeHandle(ref, () => ({
      centerOnLocation: (lat: number, lng: number) => {
        if (isMapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${lat}, ${lng}); true;`);
        }
      }
    }));

    useEffect(() => {
      let isMounted = true;
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        
        if (status !== 'granted') {
          setLocationPermission(false);
          return;
        }
        setLocationPermission(true);

        try {
          if (initialLocation) {
            // Already handled in onLoadEnd
          } else {
            let location = await Location.getLastKnownPositionAsync();
            if (!location) {
              location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            }
            const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            if (!isMounted) return;
            setUserLocation(coords);
            fetchAddress(coords);
          }
        } catch (error) {
          console.log("Error getting location:", error);
          if (!isMounted) return;
          if (!initialLocation) {
            const fallbackCoords = { latitude: 6.9271, longitude: 79.8612 };
            setUserLocation(fallbackCoords);
            if (isMapReady && webViewRef.current) {
              webViewRef.current.injectJavaScript(`window.centerOnUser(${fallbackCoords.latitude}, ${fallbackCoords.longitude}); true;`);
            }
            fetchAddress(fallbackCoords);
          }
        }
      })();
      return () => { isMounted = false; };
    }, [initialLocation]);

    // Ensure the map centers when location is found and map becomes ready
    useEffect(() => {
      if (isMapReady && webViewRef.current && userLocation && !initialLocation) {
        webViewRef.current.injectJavaScript(`window.centerOnUser(${userLocation.latitude}, ${userLocation.longitude}); true;`);
      }
    }, [isMapReady, userLocation, initialLocation]);

    // Inject warnings if in report mode
    useEffect(() => {
      if (mode === 'report' && isMapReady && webViewRef.current) {
        const payload = warnings.map(w => ({
          id: w.id,
          centroid: w.centroid,
          polygon: w.polygon,
          radiusMeters: w.radiusMeters,
          color: w.riskLevel === 'CRITICAL' ? Colors.danger : w.riskLevel === 'HIGH' ? Colors.warning : w.riskLevel === 'MEDIUM' ? '#EAB308' : '#2E75D6',
          active: w.status === 'Active',
          label: w.title,
          meta: w.affectedArea + " · " + w.riskLevel + " risk"
        }));
        
        const script = `
          if (window.updateWarnings) {
            var data = ${JSON.stringify(payload)};
            window.updateWarnings(JSON.stringify(data));
          }
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }, [warnings, isMapReady, mode]);

    const fetchAddress = async (coords: { latitude: number; longitude: number }) => {
      onLocationSelect?.(coords, '', true);
      try {
        const geocode = await Location.reverseGeocodeAsync(coords);
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          const areaName = [place.name, place.street, place.district || place.city || place.subregion, place.postalCode].filter(Boolean).join(', ');
          onLocationSelect?.(coords, areaName || 'Unknown Location', false);
        } else {
          onLocationSelect?.(coords, 'Unknown Location', false);
        }
      } catch (error) {
        onLocationSelect?.(coords, 'Failed to fetch address', false);
      }
    };

    const handleWebViewMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'mapTap') {
          const coords = { latitude: data.lat, longitude: data.lng };
          fetchAddress(coords);
        } else if (data.type === 'reportTap' && data.id) {
          onReportTap?.(data.id);
        }
      } catch (e) {
        console.log('WebView message error:', e);
      }
    };

    const handleLocateMe = async () => {
      try {
        let location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        }
        if (location) {
          const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setUserLocation(coords);
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.centerOnUser(${coords.latitude}, ${coords.longitude}); true;`);
          }
          fetchAddress(coords);
        }
      } catch (error) {
        console.log("Location error:", error);
        Alert.alert(t('common.error', "Location Error"), t('map.locationErrorMsg', "Unable to retrieve your location. Please ensure location services are enabled on your device."));
        if (userLocation) {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.centerOnUser(${userLocation.latitude}, ${userLocation.longitude}); true;`);
          }
          fetchAddress(userLocation);
        } else {
          const fallbackCoords = { latitude: 7.8731, longitude: 80.7718 };
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.centerOnUser(${fallbackCoords.latitude}, ${fallbackCoords.longitude}); true;`);
          }
          fetchAddress(fallbackCoords);
        }
      }
    };

    if (locationPermission === null) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (locationPermission === false) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{t('map.permissionDenied', 'Location permission is required to use the map.')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => {
            setIsMapReady(true);
            if (initialLocation && webViewRef.current) {
              webViewRef.current.injectJavaScript(`window.centerOnUser(${initialLocation.latitude}, ${initialLocation.longitude}); true;`);
              fetchAddress(initialLocation);
            } else if (userLocation && webViewRef.current) {
              webViewRef.current.injectJavaScript(`window.centerOnUser(${userLocation.latitude}, ${userLocation.longitude}); true;`);
            }
          }}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />

        {/* Locate Me FAB */}
        <TouchableOpacity
          style={[styles.locateButton, { bottom: locateMeButtonBottom }]}
          onPress={handleLocateMe}
        >
          <Ionicons name="locate" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  }
});
