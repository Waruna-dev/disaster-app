import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { Logo } from './Logo';
import { useTranslation } from 'react-i18next';
import { HomeArea } from '../types/location';
import { UserAvatar } from './UserAvatar';

export function DashboardStickyBar({ scrollY, initial, imageUrl }: { scrollY: Animated.Value, initial: string, imageUrl?: string | null }) {
  const insets = useSafeAreaInsets();
  
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.stickyBar}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
      <View style={[styles.stickyBarContent, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoContainer}>
          <View style={styles.shieldIcon}>
            <Logo width={18} height={26} color={Colors.primary} />
          </View>
          <Text style={styles.brandTitle}>FloodGuard</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.avatarButton} 
            activeOpacity={0.7}
            onPress={() => router.push('/(user)/(tabs)/profile')}
          >
            <UserAvatar 
              imageUrl={imageUrl} 
              name={initial} 
              size={36} 
              borderWidth={0} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function DashboardHeader({ scrollY, firstName, homeArea, currentLocationName = 'Locating...' }: { scrollY: Animated.Value, firstName: string, homeArea: HomeArea | null, currentLocationName?: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  const headerHeight = 280 + insets.top; // Sufficient space for content

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [-50, 0, 100],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: headerTranslateY }] }]}>
        <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 402 ${220 + insets.top}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
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
        {/* Decorative circles from auth screen */}
        <Circle cx="419" cy="78" r="100" fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={26} />
        <Circle cx="-26" cy="91" r="89" fill={Colors.white} fillOpacity={0.035} />
        </Svg>
      </Animated.View>

      <View style={[styles.content, { paddingTop: insets.top + 16 + 50 }]}>
        {/* Middle Row: Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingSub}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>{firstName}</Text>
        </View>

        {/* Bottom Row: Location Pills */}
        <View style={styles.locationRow}>
          <TouchableOpacity style={[styles.activePill, { flexShrink: 1, maxWidth: '55%' }]} activeOpacity={0.7}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={[styles.activePillText, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{currentLocationName}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.inactivePill, { flexShrink: 1, maxWidth: '45%' }]} 
            activeOpacity={0.7}
            onPress={() => router.push('/(user)/edit-profile?scrollTo=homeArea' as any)}
          >
            <Ionicons name={homeArea ? "home" : "home-outline"} size={16} color={Colors.white} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.inactivePillText, {color: Colors.white, marginLeft: 4, fontWeight: '600', fontSize: 13, flexShrink: 1, maxWidth: 120}]}>
              {homeArea ? homeArea.name : t('profile.setHomeArea', 'Set home area')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  stickyBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 32,
    height: 32,
    backgroundColor: Colors.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
    position: 'absolute',
    top: 10,
    right: 10,
    borderWidth: 2,
    borderColor: '#0A7257', // match the background gradient roughly
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    marginBottom: 20,
  },
  greetingSub: {
    color: Colors.headerSubtitle,
    fontSize: 14,
    marginBottom: 2,
  },
  greetingName: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activePillText: {
    color: Colors.textDark,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 8,
    maxWidth: 120,
  },
  inactivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inactivePillText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
