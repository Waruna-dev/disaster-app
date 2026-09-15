import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export function AlertCard() {
  return (
    <View style={styles.card}>
      <View style={styles.borderLeft} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
          <View style={styles.severityBadge}>
            <Text style={styles.severityText}>MODERATE</Text>
          </View>
        </View>

        <Text style={styles.title}>Flood warning</Text>
        <Text style={styles.location}>Biyagama Road, Kelaniya</Text>

        <View style={styles.footer}>
          <Text style={styles.timestamp}>Updated 10 minutes ago</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewDetails}>View details ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    marginHorizontal: 24,
    marginTop: -40, // overlap the header wave
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  borderLeft: {
    width: 6,
    backgroundColor: '#F39C12', // Orange for moderate
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  severityBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    color: '#D68910',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
