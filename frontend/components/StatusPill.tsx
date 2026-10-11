import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  Available: { bg: '#E6F4EA', fg: '#2E7D32' },
  Limited: { bg: '#FFF4DC', fg: '#B8860B' },
  Full: { bg: '#FCE8E8', fg: '#D32F2F' },
  Closed: { bg: '#EDEFEF', fg: '#647A76' },
  Pending: { bg: '#FFF4DC', fg: '#B8860B' },
  Assigned: { bg: '#E3F0FC', fg: '#1D6FC4' },
  Rejected: { bg: '#FCE8E8', fg: '#D32F2F' },
  Completed: { bg: '#E6F4EA', fg: '#2E7D32' },
  'On Mission': { bg: '#E3F0FC', fg: '#1D6FC4' },
  Unavailable: { bg: '#EDEFEF', fg: '#647A76' },
  'On the way': { bg: '#E3F0FC', fg: '#1D6FC4' },
  Pickup: { bg: '#F1E7FB', fg: '#7B3FA0' },
};

export function StatusPill({ status }: { status: string }) {
  const palette = COLOR_MAP[status] || { bg: '#EDEFEF', fg: '#647A76' };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
