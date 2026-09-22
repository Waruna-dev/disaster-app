import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { useTranslation } from 'react-i18next';

export function ReportsStickyBar({ scrollY }: { scrollY: Animated.Value }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.stickyBar}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
      <View style={[styles.stickyBarContent, { paddingTop: insets.top + 20 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{t('reports.myReports')}</Text>
          <Text style={styles.subtitle}>{t('reports.trackSubmitted')}</Text>
        </View>
      </View>
    </View>
  );
}

export function ReportsHeader({ scrollY }: { scrollY: Animated.Value }) {
  const insets = useSafeAreaInsets();
  const headerHeight = 220 + insets.top; // Adjust based on needs

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
        viewBox={`0 0 402 ${180 + insets.top}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="reportsHeaderGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={Colors.gradientStart} />
            <Stop offset="1" stopColor={Colors.gradientEnd} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`
            M0 0
            H402
            V${129 + insets.top}
            C323 ${159 + insets.top} 247 ${154 + insets.top} 183 ${133 + insets.top}
            C117 ${111 + insets.top} 62 ${117 + insets.top} 0 ${144 + insets.top}
            V0
            Z
          `}
          fill="url(#reportsHeaderGradient)"
        />
          <Circle cx="350" cy="50" r="100" fill={Colors.white} fillOpacity={0.035} />
        </Svg>
      </Animated.View>

      <View style={[styles.content, { paddingTop: insets.top + 20 + 80 }]}>
        {/* Content goes here if needed */}
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
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
  },
  content: {
    paddingHorizontal: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  title: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.headerSubtitle,
    fontSize: 14,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', // Light translucent background
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
