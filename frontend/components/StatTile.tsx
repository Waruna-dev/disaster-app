import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint: string;
  tintBg: string;
  onPress?: () => void;
}

export function StatTile({ icon, value, label, tint, tintBg, onPress }: StatTileProps) {
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: tintBg }]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={76} color={tint} style={styles.bgIcon} />

      <View style={[styles.iconWrapper, { shadowColor: tint }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
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
