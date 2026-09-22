import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, PanResponder, Image, ScrollView, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Report } from '../../../types/report';
import { buildUserMapHtml } from '../../../utils/userMapHtml';

export default function MapScreen() {
  const { t } = useTranslation();

  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  // Pan Responder for swipe gestures on bottom card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only claim the touch if they actually swipe (move > 10px vertically)
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Swipe Down
        if (gestureState.dy > 50) {
          setCardState(prev => prev === 'expanded' ? 'default' : 'minimized');
        }
        // Swipe Up
        else if (gestureState.dy < -50) {
          setCardState(prev => prev === 'minimized' ? 'default' : 'expanded');
        }
      }
    })
  ).current;

  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('Loading address...');
  
  const [reports, setReports] = useState<Report[]>([]);

  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [cardState, setCardState] = useState<'minimized' | 'default' | 'expanded'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'flood' | 'landslide'>('all');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        let q;
        if (activeFilter === 'all') {
          q = query(collection(db, 'reports'), where('status', '==', 'Verified'));
        } else {
          q = query(collection(db, 'reports'), where('status', '==', 'Verified'), where('disasterType', '==', activeFilter));
        }
        
        const snapshot = await getDocs(q);
        const fetchedReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter((r: any) => r.latitude && r.longitude) as Report[];
        setReports(fetchedReports);
      } catch (error) {
        console.error('Failed to fetch reports for map:', error);
      }
    };
    
    fetchReports();
  }, [activeFilter]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);

      try {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setUserLocation(coords);
        setSelectedLocation(coords);
        
        // The webview will center automatically or we inject once ready
        if (isMapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${coords.latitude}, ${coords.longitude}); true;`);
        }

        fetchAddress(coords);
      } catch (error) {
        console.log("Error getting location:", error);
        // Fallback location (e.g., Colombo, Sri Lanka) if GPS is off on emulator
        const fallbackCoords = { latitude: 6.9271, longitude: 79.8612 };
        setUserLocation(fallbackCoords);
        setSelectedLocation(fallbackCoords);
        if (isMapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${fallbackCoords.latitude}, ${fallbackCoords.longitude}); true;`);
        }
        fetchAddress(fallbackCoords);
      }
    })();
  }, []);

  const fetchAddress = async (coords: { latitude: number, longitude: number }) => {
    try {
      const geocode = await Location.reverseGeocodeAsync(coords);
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const areaName = [place.name, place.street, place.district || place.city || place.subregion, place.postalCode].filter(Boolean).join(', ');
        setSelectedAddress(areaName || 'Unknown Location');
      } else {
        setSelectedAddress('Unknown Location');
      }
    } catch (error) {
      setSelectedAddress('Failed to fetch address');
    }
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapTap') {
        const coords = { latitude: data.lat, longitude: data.lng };
        setSelectedLocation(coords);
        setSelectedReport(null);
        setCardState('default');
        fetchAddress(coords);
      } else if (data.type === 'reportTap' && data.id) {
        const report = reports.find(r => r.id === data.id);
        if (report) {
          setSelectedReport(report);
          setCardState('default');
        }
      }
    } catch (e) {
      console.log('WebView message error:', e);
    }
  };

  const handleLocateMe = async () => {
    try {
      let location = await Location.getLastKnownPositionAsync();
      if (!location) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (location) {
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setUserLocation(coords);
        setSelectedLocation(coords);
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${coords.latitude}, ${coords.longitude}); true;`);
        }
        setSelectedReport(null);
        fetchAddress(coords);
      }
    } catch (error) {
        console.log("Location error:", error);
        Alert.alert("Location Error", "Unable to retrieve your location. Please ensure location services are enabled on your device.");
        if (userLocation) {
        setSelectedLocation(userLocation);
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${userLocation.latitude}, ${userLocation.longitude}); true;`);
        }
        setSelectedReport(null);
        fetchAddress(userLocation);
      } else {
        // Fallback to default region if no user location
        const coords = { latitude: 7.8731, longitude: 80.7718 };
        setSelectedLocation(coords);
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.centerOnUser(${coords.latitude}, ${coords.longitude}); true;`);
        }
        setSelectedReport(null);
        fetchAddress(coords);
      }
    }
  };

  const handleReportLocation = () => {
    if (!selectedLocation) return;
    router.push({
      pathname: '/report/create',
      params: {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        address: selectedAddress,
      }
    });
  };

  // Only initialize the HTML with empty reports so it doesn't reload entirely
  const mapHtml = useMemo(() => buildUserMapHtml([]), []);

  // Update markers via JavaScript injection when reports change
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      const points = reports
        .filter(r => r.latitude && r.longitude)
        .map(r => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        type: r.disasterType,
      }));
      const script = `window.updateMarkers && window.updateMarkers('${JSON.stringify(points)}'); true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [reports, isMapReady]);

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
          // If we already have user location by the time it loads, place the pin
          if (userLocation && webViewRef.current) {
             webViewRef.current.injectJavaScript(`window.centerOnUser(${userLocation.latitude}, ${userLocation.longitude}); true;`);
          }
        }}
      />

      {/* Top Floating Header */}
      <View style={styles.topHeaderContainer}>
        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'flood' && styles.filterChipActive]}
            onPress={() => setActiveFilter('flood')}
          >
            <MaterialIcons name="flood" size={16} color={activeFilter === 'flood' ? 'white' : 'orange'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, activeFilter === 'flood' && styles.filterTextActive]}>Floods</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'landslide' && styles.filterChipActive]}
            onPress={() => setActiveFilter('landslide')}
          >
            <MaterialIcons name="landslide" size={16} color={activeFilter === 'landslide' ? 'white' : Colors.danger} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, activeFilter === 'landslide' && styles.filterTextActive]}>Landslides</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Locate Me FAB */}
      <TouchableOpacity 
        style={[
          styles.locateButton, 
          { bottom: cardState === 'minimized' ? 100 : (selectedReport ? (cardState === 'expanded' ? 450 : 210) : 280) }
        ]} 
        onPress={handleLocateMe}
      >
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* Bottom Sheet / Card */}
      <View style={[styles.bottomCard, cardState === 'expanded' && { maxHeight: '70%' }]} {...panResponder.panHandlers}>
        <TouchableOpacity 
          style={styles.dragHandleContainer} 
          activeOpacity={0.7} 
          onPress={() => setCardState(prev => prev === 'minimized' ? 'default' : 'minimized')}
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>

        {cardState !== 'minimized' && (
          <>
            {selectedReport ? (
              <View>
            <Text style={styles.cardTitle}>{selectedReport.disasterType === 'flood' ? 'Flood' : 'Landslide'} Report</Text>
            <Text style={styles.cardSubtitle}>{selectedReport.affectedArea}</Text>
            
            {selectedReport.createdAt && (
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.dateText}>
                  Submitted: {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleString() : new Date(selectedReport.createdAt.seconds * 1000).toLocaleString()}
                </Text>
              </View>
            )}
            
            <Text style={styles.cardDescription}>{selectedReport.description}</Text>
            {cardState === 'expanded' && (
              <View style={{ marginTop: 16, minHeight: 160, justifyContent: 'center' }}>
                {(selectedReport.photoUrls?.length > 0 || selectedReport.photoUrl) ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(selectedReport.photoUrls || [selectedReport.photoUrl]).map((url: string, index: number) => url ? (
                      <Image 
                        key={index}
                        source={{ uri: url }} 
                        style={{ width: 160, height: 160, borderRadius: 12, marginRight: 12 }} 
                        resizeMode="cover" 
                      />
                    ) : null)}
                  </ScrollView>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Colors.background, borderRadius: 12 }}>
                    <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                    <Text style={{ marginTop: 8, color: Colors.textMuted }}>No images attached to this report.</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedReport(null)}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.cardTitle}>Report an incident here</Text>
            <Text style={styles.cardSubtitle}>Tap another point on the map if the incident is elsewhere.</Text>
            
            <View style={styles.addressBox}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={styles.addressTextContainer}>
                <Text style={styles.addressText}>{selectedAddress}</Text>
                <Text style={styles.addressSubtext}>Selected location</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.reportButton} onPress={handleReportLocation}>
              <Text style={styles.reportButtonText}>Report this location</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </View>
    </View>
  );
}

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
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
  },
  topHeaderContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  filterTextActive: {
    color: 'white',
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 10,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    minHeight: 50,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 2.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  addressSubtext: {
    fontSize: 12,
    color: Colors.textMedium,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 8,
  },
});
