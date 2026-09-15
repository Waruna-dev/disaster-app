import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../constants/colors';

export function CreateReportHeader() {
  const insets = useSafeAreaInsets();
  const headerHeight = 160 + insets.top; 

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 402 ${180 + insets.top}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="createHeaderGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={Colors.gradientStart} />
            <Stop offset="1" stopColor={Colors.gradientEnd} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`
            M0 0
            H402
            V${99 + insets.top}
            C323 ${129 + insets.top} 247 ${124 + insets.top} 183 ${103 + insets.top}
            C117 ${81 + insets.top} 62 ${87 + insets.top} 0 ${114 + insets.top}
            V0
            Z
          `}
          fill="url(#createHeaderGradient)"
        />
        {/* large circle background behind back button/title area */}
        <Path
          d="M 400 -50 A 150 150 0 0 1 200 100"
          fill="none"
          stroke={Colors.white}
          strokeWidth="30"
          strokeOpacity={0.05}
        />
      </Svg>

      <View style={[styles.content, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Report incident</Text>
            <Text style={styles.subtitle}>Share only what you can safely observe</Text>
          </View>
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
  content: {
    paddingHorizontal: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.headerSubtitle,
    fontSize: 13,
  },
});
