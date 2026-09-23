import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Linking, Platform, ToastAndroid, Alert } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNearbyServicesContext, EmergencyService } from '../../../contexts/NearbyServicesContext';
import { ShareLocationCard } from '../../../components/emergency/ShareLocationCard';
import { NationalEmergencyGrid } from '../../../components/emergency/NationalEmergencyGrid';
import { PersonalEmergencyContacts } from '../../../components/emergency/PersonalEmergencyContacts';
import { useTranslation } from 'react-i18next';

export default function EmergencyContactsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { services, isInitialLoading, isRefreshing, error, locationDenied, isUsingCache, lastUpdated, refreshServices } = useNearbyServicesContext();
  
  const scrollY = useRef(new Animated.Value(0)).current;

  // For the sticky bar background and title fade-in
  const stickyOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // For the big header SVG parallax (moves at half speed of scroll)
  const svgTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [-50, 0, 100],
    extrapolate: 'clamp',
  });

  // Big header title opacity fade-out
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

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
    <View style={styles.container}>
      {/* Sticky Bar (Always at top) */}
      <View style={[styles.stickyBar, { height: 60 + insets.top, paddingTop: insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: stickyOpacity }]} />
        <View style={styles.stickyBarContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.stickyTitleContainer}>
            <Text style={styles.stickyBarTitle}>
              {t('emergency.title')}
            </Text>
            <Animated.Text style={[styles.stickyBarSubtitle, { opacity: headerContentOpacity }]}>
              {t('emergency.subtitle')}
            </Animated.Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent} 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Big Scrollable Header */}
        <View style={[styles.bigHeaderContainer, { height: 150 + insets.top }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: svgTranslateY }] }]}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 402 ${220 + insets.top}`}
              preserveAspectRatio="none"
            >
              <Defs>
                <SvgLinearGradient id="headerGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={Colors.gradientStart} />
                  <Stop offset="1" stopColor={Colors.gradientEnd} />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={`
                  M0 0
                  H402
                  V${169 + insets.top}
                  C323 ${199 + insets.top} 247 ${194 + insets.top} 183 ${173 + insets.top}
                  C117 ${151 + insets.top} 62 ${157 + insets.top} 0 ${184 + insets.top}
                  V0
                  Z
                `}
                fill="url(#headerGradient)"
              />
              <Circle cx="419" cy="78" r="100" fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={26} />
              <Circle cx="-26" cy="91" r="89" fill={Colors.white} fillOpacity={0.035} />
            </Svg>
          </Animated.View>
        </View>

        {/* Spacer for absolute header */}
        <View style={{ height: 130 + insets.top }} />

        {/* Immediate Danger Banner */}
        <View style={[styles.dangerBanner, { marginTop: 0 }]}>
          <View style={styles.dangerIconContainer}>
            <Ionicons name="alert" size={24} color="#F59E0B" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.dangerTitle}>{t('emergency.immediateDanger')}</Text>
            <Text style={styles.dangerSubtitle}>{t('emergency.moveSafety')}</Text>
          </View>
          <TouchableOpacity style={styles.callActionButton}>
            <Ionicons name="call" size={20} color="#B45309" />
          </TouchableOpacity>
        </View>

        {/* Share Location Card Component */}
        <ShareLocationCard />

        {/* National Emergency Services Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('emergency.nationalServices')}</Text>
        </View>
        <NationalEmergencyGrid />

        {/* Nearby Services (Intentionally Kept As Is) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('emergency.nearbyServices')}</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity onPress={refreshServices} style={styles.refreshButton} disabled={isRefreshing}>
              {isRefreshing ? (
                 <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                 <Ionicons name="refresh" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(user)/emergency/nearby-services' as any)}>
              <Text style={styles.viewAllText}>{t('emergency.viewAll')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {isInitialLoading && services.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('emergency.searching')}</Text>
          </View>
        ) : locationDenied ? (
          <View style={styles.errorContainer}>
            <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>Location Permission Denied</Text>
            <Text style={styles.errorDesc}>We need your location to find nearby services.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshServices}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={32} color={Colors.textMuted} />
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
            <View style={styles.listCard}>
              <View style={styles.listCardTop}>
                <View style={[styles.listCardIconBox, 
                  services[0].type === 'hospital' ? { backgroundColor: '#0288D1' } : 
                  services[0].type === 'police' ? { backgroundColor: '#3F51B5' } : 
                  { backgroundColor: '#E64A19' }
                ]}>
                  {renderServiceIcon(services[0].type)}
                </View>
                <View style={styles.listCardInfo}>
                  <Text style={styles.listCardTitle} numberOfLines={1}>{services[0].name}</Text>
                  <Text style={styles.listCardSubtitle}>
                    {services[0].type === 'hospital' ? 'Hospital' : services[0].type === 'police' ? 'Police Station' : 'Fire Station'} • {services[0].distanceKm.toFixed(1)} km away
                  </Text>
                  <View style={styles.gpsBadge}>
                    <View style={styles.gpsDot} />
                    <Text style={styles.gpsText}>Based on your current GPS location</Text>
                  </View>
                </View>
                <View style={styles.listCardActions}>
                  {services[0].phone ? (
                    <TouchableOpacity style={styles.listCallButton} onPress={() => handleCall(services[0].phone!)}>
                      <Text style={styles.btnText}>Call now</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.disabledCallButton}>
                      <Text style={styles.disabledBtnText}>Unavailable</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cardMapButton} onPress={() => handleMap(services[0].latitude, services[0].longitude)}>
                    <Text style={styles.btnTextOutline}>View map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.attributionText}>Nearby service data © OpenStreetMap contributors</Text>
          </View>
        )}

        {/* Personal Emergency Contacts Component */}
        <PersonalEmergencyContacts />

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFC',
  },
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    justifyContent: 'flex-end',
  },
  stickyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyBarTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  stickyBarSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    position: 'absolute',
    top: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  bigHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  dangerBanner: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dangerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 12,
    color: '#B45309',
  },
  callActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  refreshButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  listCallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  btnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  },
  listCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
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
    marginBottom: 6,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  gpsText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  listCardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardMapButton: {
    borderWidth: 1,
    borderColor: '#C9DAD6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnTextOutline: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFC',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E6EFEA',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 12,
    marginBottom: 4,
  },
  errorDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  cachedText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  disabledCallButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  disabledBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  attributionText: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 24,
  }
});
