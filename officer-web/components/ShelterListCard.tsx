import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Shelter } from '../types/shelter';
import { StatusPill } from './StatusPill';

export function ShelterListCard({ shelter, onPress }: { shelter: Shelter; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="home" size={22} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{shelter.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{shelter.location}</Text>
        <Text style={styles.occupancy}>{shelter.currentOccupancy}/{shelter.capacity} occupied</Text>
      </View>
      <View style={styles.right}>
        <StatusPill status={shelter.status} />
        <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF3F1',
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5F2',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  meta: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  occupancy: { fontSize: 12, color: Colors.textMedium, fontWeight: '600' },
  right: { alignItems: 'flex-end', marginLeft: 8 },
});
