import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export function StatsCard({ total, pending, approved }: { total: number; pending: number; approved: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.column}>
        <Text style={styles.valueTotal}>{total}</Text>
        <Text style={styles.label}>Total</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.column}>
        <Text style={styles.valuePending}>{pending}</Text>
        <Text style={styles.label}>Pending</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.column}>
        <Text style={styles.valueApproved}>{approved}</Text>
        <Text style={styles.label}>Approved</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginHorizontal: 24,
    marginTop: -50,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F0F5F4',
  },
  valueTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  valuePending: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D68910', // Orange
    marginBottom: 4,
  },
  valueApproved: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary, // Green
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
  }
});
