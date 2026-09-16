import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint: string;
  tintBg: string;
}

export function StatTile({ icon, value, label, tint, tintBg }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.iconWrapper, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F5F4',
    minWidth: '45%',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
