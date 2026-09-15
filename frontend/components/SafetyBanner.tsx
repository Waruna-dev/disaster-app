import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function SafetyBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.exclamation}>!</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Your safety comes first</Text>
        <Text style={styles.subtitle}>Do not enter a dangerous area to collect evidence.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF4E6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: -40, // overlap header
    borderWidth: 1,
    borderColor: '#FFE8CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F39C12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exclamation: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#B9770E',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: '#D68910',
    fontSize: 12,
  }
});
