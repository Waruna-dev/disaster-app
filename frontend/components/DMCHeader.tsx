import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';

interface DMCHeaderProps {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  onRightPress?: () => void;
}

// Same curved-gradient background as the resident DashboardHeader (components/DashboardHeader.tsx),
// just shorter and with DMC-admin-specific content, so both apps share one visual language.
export function DMCHeader({ eyebrow, title, onBack, onRightPress }: DMCHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = 190 + insets.top;

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 402 ${220 + insets.top}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="adminHeaderGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
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
          fill="url(#adminHeaderGradient)"
        />
        <Circle cx="419" cy="78" r="100" fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={26} />
        <Circle cx="-26" cy="91" r="89" fill={Colors.white} fillOpacity={0.035} />
      </Svg>

      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onBack} disabled={!onBack}>
            <Ionicons name={onBack ? 'chevron-back' : 'menu'} size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onRightPress}>
            <Ionicons name={onBack ? 'ellipsis-vertical' : 'notifications-outline'} size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
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
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.headerSubtitle,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
});
