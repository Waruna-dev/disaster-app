import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface StatTileProps {
  /** Ionicons glyph — omit and use `materialIcon` instead for a Material Community icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Material Community Icons glyph, for icons Ionicons doesn't have (e.g. a flood pictogram). */
  materialIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  label: string;
  tint: string;
  tintBg: string;
  /** Overrides the icon's color independently of `tint` (which still colors the value text). */
  iconColor?: string;
  onPress?: () => void;
  /** Spans the whole row instead of sharing it two-per-row. */
  fullWidth?: boolean;
  /** Drops the two-per-row minimum width so three or more tiles can share one row. */
  compact?: boolean;
}

export function StatTile({ icon, materialIcon, value, label, tint, tintBg, iconColor, onPress, fullWidth, compact }: StatTileProps) {
  const resolvedIconColor = iconColor ?? tint;
  const IconGlyph = materialIcon ? (
    <MaterialCommunityIcons name={materialIcon} size={76} color={resolvedIconColor} style={styles.bgIcon} />
  ) : (
    <Ionicons name={icon!} size={76} color={resolvedIconColor} style={styles.bgIcon} />
  );
  const IconSmall = materialIcon ? (
    <MaterialCommunityIcons name={materialIcon} size={20} color={resolvedIconColor} />
  ) : (
    <Ionicons name={icon!} size={20} color={resolvedIconColor} />
  );

  return (
    <TouchableOpacity
      style={[styles.tile, fullWidth && styles.tileFull, compact && styles.tileCompact, { backgroundColor: tintBg }]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      {IconGlyph}

      <View style={[styles.iconWrapper, { shadowColor: resolvedIconColor }]}>{IconSmall}</View>
      <Text style={[styles.value, { color: tint }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minWidth: '45%',
    overflow: 'hidden',
    position: 'relative',
  },
  tileCompact: {
    minWidth: 0,
    padding: 14,
  },
  tileFull: {
    flexBasis: '100%',
  },
  bgIcon: {
    position: 'absolute',
    right: -16,
    bottom: -18,
    opacity: 0.16,
    transform: [{ rotate: '-12deg' }],
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: Colors.white,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
