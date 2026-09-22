import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNearbyServicesContext, EmergencyService } from '../../../contexts/NearbyServicesContext';

export default function NearbyServicesScreen() {
  const insets = useSafeAreaInsets();
  const { services, isInitialLoading, isRefreshing, error, locationDenied, isUsingCache, lastUpdated, refreshServices } = useNearbyServicesContext();

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleMap = (lat: number, lon: number) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
  };

  const renderServiceIcon = (type: EmergencyService['type']) => {
    switch (type) {
      case 'hospital': return <Ionicons name="medkit" size={20} color={Colors.white} />;
      case 'police': return <Ionicons name="shield-checkmark" size={20} color={Colors.white} />;
      case 'fire_station': return <Ionicons name="flame" size={20} color={Colors.white} />;
      default: return <Ionicons name="location" size={20} color={Colors.white} />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Nearby Services</Text>
        <TouchableOpacity onPress={refreshServices} style={styles.refreshButton} disabled={isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isInitialLoading && services.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Searching nearby services...</Text>
          </View>
        ) : locationDenied ? (
          <View style={styles.errorContainer}>
            <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>Location Permission Denied</Text>
            <Text style={styles.errorDesc}>We need your location to find nearby services.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshServices}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>No Services Found</Text>
            <Text style={styles.errorDesc}>{error || "Couldn't find any emergency services nearby."}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshServices}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {isUsingCache ? (
              <Text style={styles.cachedText}>Showing saved results • Last updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}</Text>
            ) : null}
            {services.map((service) => (
              <View style={styles.listCard} key={`${service.osmType}:${service.id}`}>

                <View style={styles.listCardTop}>
                  <View style={[styles.listCardIconBox, 
                    service.type === 'hospital' ? { backgroundColor: '#0288D1' } : 
                    service.type === 'police' ? { backgroundColor: '#3F51B5' } : 
                    { backgroundColor: '#E64A19' }
                  ]}>
                    {renderServiceIcon(service.type)}
                  </View>
                  <View style={styles.listCardInfo}>
                    <Text style={styles.listCardTitle} numberOfLines={2}>{service.name}</Text>
                    <Text style={styles.listCardSubtitle}>
                      {service.type === 'hospital' ? 'Hospital' : service.type === 'police' ? 'Police Station' : 'Fire Station'} • {service.distanceKm.toFixed(1)} km away
                    </Text>
                  </View>
                </View>
                <Text style={styles.addressText} numberOfLines={1}>{service.address}</Text>
                <View style={styles.listCardActions}>
                  {service.phone ? (
                    <TouchableOpacity style={styles.listCallButton} onPress={() => handleCall(service.phone!)}>
                      <Ionicons name="call" size={14} color={Colors.white} style={styles.btnIcon} />
                      <Text style={styles.btnText}>Call now</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.disabledCallButton}>
                      <Text style={styles.disabledBtnText}>Unavailable</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cardMapButton} onPress={() => handleMap(service.latitude, service.longitude)}>
                    <Ionicons name="map" size={14} color={Colors.primary} style={styles.btnIcon} />
                    <Text style={styles.btnTextOutline}>View map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <Text style={styles.attributionText}>Nearby service data © OpenStreetMap contributors</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  refreshButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textMuted,
    fontSize: 15,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  cachedText: {
    fontSize: 13,
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listCardInfo: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  listCardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  addressText: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },
  listCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  listCallButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCallButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  cardMapButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C9DAD6',
    borderRadius: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  btnTextOutline: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  attributionText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  }
});
