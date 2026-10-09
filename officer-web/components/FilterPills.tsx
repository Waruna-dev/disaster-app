import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { useTranslation } from 'react-i18next';

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

export function FilterPills({ activeFilter, onSelectFilter }: { activeFilter: string; onSelectFilter: (filter: string) => void; }) {
  const { t } = useTranslation();
  
  const getDisplayFilter = (f: string) => {
    switch(f) {
      case 'All': return t('reports.all');
      case 'Pending': return t('reports.pending');
      case 'Approved': return t('reports.approved');
      case 'Rejected': return t('reports.rejected');
      default: return f;
    }
  };

  return (
    <View style={styles.container}>
      {filters.map((filter, index) => {
        const isActive = filter === activeFilter;
        return (
          <TouchableOpacity 
            key={filter} 
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            activeOpacity={0.7}
            onPress={() => onSelectFilter(filter)}
          >
            <Text style={[styles.pillText, isActive ? styles.textActive : styles.textInactive]}>
              {getDisplayFilter(filter)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 14, // Reduced because pills have marginBottom
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10, 
    marginBottom: 10,
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
