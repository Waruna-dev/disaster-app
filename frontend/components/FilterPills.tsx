import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

export function FilterPills() {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filters.map((filter, index) => {
          const isActive = index === 0; // 'All' is active for now
          return (
            <TouchableOpacity 
              key={filter} 
              style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isActive ? styles.textActive : styles.textInactive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10, 
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E8F1EF',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: Colors.white,
  },
  textInactive: {
    color: Colors.textLight,
  }
});
