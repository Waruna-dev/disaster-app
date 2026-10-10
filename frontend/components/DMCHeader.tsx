import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';

// Single-line compact base height (excludes safe-area inset) — exported so screens
// doing their own scroll-driven header animation (see dashboard.tsx) can size the
// content offset without duplicating this number and drifting out of sync.
export const DMC_HEADER_COMPACT_HEIGHT = 152;

interface DMCHeaderProps {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  onMenuPress?: () => void;
  onRightPress?: () => void;
  badgeCount?: number;
  /** Shrinks the curve/title to free up vertical space for content-heavy screens (e.g. a map). */
  compact?: boolean;
  /**
   * Omits the back/menu and right icon buttons while keeping the row's height reserved,
   * for screens that render their own always-visible icon bar on top of this header
   * (see dashboard.tsx's persistent bar + collapsing-header pattern).
   */
  hideIcons?: boolean;
}

interface DMCHeaderBackgroundProps {
  compact?: boolean;
  /** Rendered height of the full header. A parent that clips this to a shorter strip still gets the identical gradient slice. */
  height: number;
}

// The curved gradient + decorative circles, split out so a screen can paint the same
// pixels behind a persistent icon bar (dashboard.tsx) and the header never shows a seam.
export function DMCHeaderBackground({ compact, height }: DMCHeaderBackgroundProps) {
  const insets = useSafeAreaInsets();
  const viewBoxHeight = (compact ? 176 : 220) + insets.top;

  return (
    <View style={[styles.background, { height }]} pointerEvents="none">
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 402 ${viewBoxHeight}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <SvgLinearGradient id="adminHeaderGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={Colors.gradientStart} />
          <Stop offset="1" stopColor={Colors.gradientEnd} />
        </SvgLinearGradient>
      </Defs>
      {compact ? (
        <Path
          d={`
            M0 0
            H402
            V${135 + insets.top}
            C323 ${159 + insets.top} 247 ${155 + insets.top} 183 ${138 + insets.top}
            C117 ${121 + insets.top} 62 ${126 + insets.top} 0 ${147 + insets.top}
            V0
            Z
          `}
          fill="url(#adminHeaderGradient)"
        />
      ) : (
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
      )}
      <Circle cx="419" cy={compact ? 62 : 78} r={compact ? 80 : 100} fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={compact ? 21 : 26} />
      <Circle cx="-26" cy={compact ? 73 : 91} r={compact ? 71 : 89} fill={Colors.white} fillOpacity={0.035} />
    </Svg>
    </View>
  );
}

// Same curved-gradient background as the resident DashboardHeader (components/DashboardHeader.tsx),
// just shorter and with DMC-admin-specific content, so both apps share one visual language.
export function DMCHeader({ eyebrow, title, onBack, onMenuPress, onRightPress, badgeCount, compact, hideIcons }: DMCHeaderProps) {
  const insets = useSafeAreaInsets();
  // Long titles (e.g. a full street address) wrap to a second line, which can push
  // past the fixed-height curve into its lighter, low-contrast lower edge. Growing
  // the header for that case stretches the SVG curve down with it (preserveAspectRatio
  // "none"), keeping the text over solid gradient.
  const [titleLines, setTitleLines] = useState(1);
  const baseHeight = compact ? (titleLines > 1 ? 178 : DMC_HEADER_COMPACT_HEIGHT) : titleLines > 1 ? 222 : 190;
  const headerHeight = baseHeight + insets.top;
  // Back-arrow screens normally get a plain overflow button on the right; passing a badgeCount
  // (even 0) opts into the notification bell there instead.
  const showBell = !onBack || badgeCount !== undefined;

  const handleTitleLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    setTitleLines(event.nativeEvent.lines.length);
  };

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <DMCHeaderBackground compact={compact} height={headerHeight} />

      <View style={[styles.content, { paddingTop: insets.top + (compact ? 14 : 16) }]}>
        <View style={[styles.topRow, compact && styles.topRowCompact]}>
          {!hideIcons && (
            <>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                onPress={onBack ?? onMenuPress}
                disabled={!onBack && !onMenuPress}
              >
                <Ionicons name={onBack ? 'chevron-back' : 'menu'} size={20} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onRightPress}>
                <Ionicons name={showBell ? 'notifications-outline' : 'ellipsis-vertical'} size={18} color={Colors.white} />
                {showBell && !!badgeCount && badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]} onTextLayout={handleTitleLayout}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
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
    minHeight: 36,
    marginBottom: 20,
  },
  topRowCompact: {
    marginBottom: 14,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.headerSubtitle,
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eyebrowCompact: {
    fontSize: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleCompact: {
    fontSize: 19,
    lineHeight: 24,
  },
});
