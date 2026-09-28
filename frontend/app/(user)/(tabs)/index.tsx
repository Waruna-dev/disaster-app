import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../../../constants/colors';
import { DashboardHeader, DashboardStickyBar } from '../../../components/DashboardHeader';
import { AlertCard } from '../../../components/AlertCard';
import { QuickActionCard } from '../../../components/QuickActionCard';
import { UpdateListItem } from '../../../components/UpdateListItem';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getOptimizedAvatarUrl } from '../../../utils/cloudinaryUtils';
import { useUserFloodUpdates } from '../../../hooks/useUserFloodUpdates';
import { getFloodStatus } from '../../../services/floodService';
import { getRelativeTimeString } from '../../../utils/floodFormatting';
import { FloodStatus } from '../../../types/flood';
import { ActivityIndicator } from 'react-native';

import { HomeArea } from '../../../types/location';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [currentLocationName, setCurrentLocationName] = useState<string>('Locating...');

  const firstName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'User';
  const initial = userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'U';
  const isAdmin = userProfile?.occupation === 'admin' || (userProfile as any)?.role === 'admin';
  const homeArea = userProfile?.homeArea || null;
  const avatarUrl = getOptimizedAvatarUrl(userProfile?.profileImage);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocationName('Unknown');
          return;
        }

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          const name = place.district || place.city || place.subregion || 'Unknown Area';
          setCurrentLocationName(name);
        } else {
          setCurrentLocationName('Unknown Area');
        }
      } catch (error) {
        console.log('Error getting location in dashboard:', error);
        setCurrentLocationName('Unknown');
      }
    })();
  }, []);

  const { stations, latestByStation, loading, error, cached } = useUserFloodUpdates();

  const activeAlerts = React.useMemo(() => {
    const activeStatuses = ['major', 'minor', 'alert'];
    
    const alerts = Object.values(latestByStation).map(reading => {
      const station = stations.find(s => s.station === reading.gauge);
      const status = getFloodStatus(reading.waterLevel, station?.alertLevel, station?.minorFloodLevel, station?.majorFloodLevel);
      return { reading, station, status };
    }).filter(item => activeStatuses.includes(item.status));

    const severityRank: Record<string, number> = {
      major: 4,
      minor: 3,
      alert: 2,
      normal: 1,
      unknown: 0,
    };

    return alerts.sort((a, b) => {
      const priorityA = severityRank[a.status] ?? 0;
      const priorityB = severityRank[b.status] ?? 0;
      if (priorityA !== priorityB) {
         return priorityB - priorityA; // Descending severity
      }
      return b.reading.timestamp - a.reading.timestamp; // Newest first
    });
  }, [latestByStation, stations]);

  const dashboardAlerts = activeAlerts.slice(0, 5);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Firestore listener is now handled in AuthContext, no need to duplicate here
  return (
    <View style={styles.container}>
      <DashboardStickyBar scrollY={scrollY} initial={initial} imageUrl={avatarUrl} />
      <Animated.ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <DashboardHeader scrollY={scrollY} firstName={firstName} homeArea={homeArea} currentLocationName={currentLocationName} />

        <View style={styles.alertWrapper}>
          <AlertCard />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActionsRow}>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title={t('dashboard.reportIncident')} 
                subtitle={t('dashboard.floodOrLandslide')} 
                icon="add" 
                variant="solid" 
                onPress={() => router.push('/(user)/(tabs)/map')} 
              />
            </View>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title={t('dashboardExtra.emergencyContacts')} 
                subtitle={t('dashboardExtra.callOrShare')}
                icon="call-outline" 
                variant="outline" 
                onPress={() => router.push('/(user)/emergency' as any)} 
              />
            </View>
          </View>
        </View>

        {/* TEMP dev shortcut — remove once admin sign-in/redirect is wired up */}
        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.devButton} activeOpacity={0.7} onPress={() => router.push('/(DMC)/dashboard' as any)}>
              <Text style={styles.devButtonText}>{t('dashboardExtra.devViewReports')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>{t('dashboardExtra.officialRiverAlerts')}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(user)/river-updates')}>
              <Text style={styles.viewAllText}>{t('dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {loading && stations.length === 0 ? (
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={{ color: Colors.textMuted, marginTop: 8 }}>{t('dashboardExtra.checkingAlerts')}</Text>
            </View>
          ) : error && Object.keys(latestByStation).length === 0 ? (
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
               <Text style={{ color: Colors.textMuted }}>{t('dashboardExtra.alertsUnavailable')}</Text>
            </View>
          ) : dashboardAlerts.length === 0 ? (
            <View style={{ marginVertical: 20, padding: 16, backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1, borderColor: '#E8F1EF' }}>
               <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{t('dashboardExtra.noActiveAlerts')}</Text>
               <Text style={{ color: Colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 16 }}>{t('dashboardExtra.monitoredBelowWarning')}</Text>
               <TouchableOpacity 
                 style={{ backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' }}
                 onPress={() => router.push('/(user)/river-updates')}
               >
                 <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 13 }}>{t('dashboardExtra.viewRiverLevels')}</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <>
              {cached && <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 12 }}>{t('dashboardExtra.showingSaved')}</Text>}
              {dashboardAlerts.map(({ reading, status }) => {
                 let title = '';
                 let icon: any = 'water';
                 let iconColor = Colors.primary;
                 let iconBg = '#E4F4EF';

                 if (status === 'major') {
                    title = `Major flood level at ${reading.gauge}`;
                    icon = 'warning';
                    iconColor = Colors.danger;
                    iconBg = '#FDE7E7';
                 } else if (status === 'minor') {
                    title = `Minor flood level at ${reading.gauge}`;
                    icon = 'water';
                    iconColor = '#8A6900';
                    iconBg = '#FFF7D6';
                 } else if (status === 'alert') {
                    title = `Alert level reached at ${reading.gauge}`;
                    icon = 'alert';
                    iconColor = '#B66A00';
                    iconBg = '#FFF2D8';
                 }

                 const timeStr = getRelativeTimeString(reading.timestamp);
                 const desc = `${reading.basin} • ${reading.waterLevel != null && Number.isFinite(reading.waterLevel) ? reading.waterLevel.toFixed(2) : '—'} m • ${timeStr.toLowerCase()}`;

                 return (
                   <UpdateListItem
                     key={reading.gauge}
                     title={title}
                     description={desc}
                     icon={icon}
                     iconColor={iconColor}
                     iconBg={iconBg}
                     onPress={() => router.push({ pathname: '/(user)/river-updates', params: { station: reading.gauge } })}
                   />
                 );
              })}
              
              {activeAlerts.length > 5 && (
                <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                  {activeAlerts.length - 5} more stations have active alerts
                </Text>
              )}
            </>
          )}
        </View>
        
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40, // padding for the map button overlap
  },
  alertWrapper: {
    zIndex: 10,
    // Note: The AlertCard itself has a negative top margin to overlap the header
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  sectionTitleNoMargin: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16, // Using gap for spacing
  },
  actionColumn: {
    flex: 1,
  },
  devButton: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
