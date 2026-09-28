import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface DisasterSelectorProps {
  selected: 'flood' | 'landslide';
  onSelect: (type: 'flood' | 'landslide') => void;
}

export function DisasterSelector({ selected, onSelect }: DisasterSelectorProps) {
  const { t } = useTranslation();
  const isFlood = selected === 'flood';
  const isLandslide = selected === 'landslide';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('reportCreate.disasterTypeLabel')} <Text style={styles.asterisk}>*</Text></Text>
      
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.card, isFlood ? styles.cardActive : styles.cardInactive]} 
          onPress={() => onSelect('flood')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: isFlood ? Colors.primary : '#F0F5F4' }]}>
            <Ionicons name="water" size={20} color={isFlood ? Colors.white : Colors.placeholder} />
          </View>
          <Text style={[styles.cardText, isFlood && styles.textActive]}>{t('reportCreate.flood')}</Text>
          {isFlood ? (
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, isLandslide ? styles.cardActive : styles.cardInactive]} 
          onPress={() => onSelect('landslide')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: isLandslide ? '#D1D5DB' : '#F0F5F4' }]}>
            <Ionicons name="image" size={20} color={isLandslide ? Colors.textDark : Colors.placeholder} />
          </View>
          <Text style={[styles.cardText, isLandslide && styles.textActive]}>{t('reportCreate.landslide')}</Text>
          {isLandslide ? (
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  asterisk: {
    color: Colors.danger,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8, 
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cardActive: {
    backgroundColor: '#F5FAF9',
    borderColor: Colors.primary,
  },
  cardInactive: {
    backgroundColor: Colors.white,
    borderColor: '#E8F1EF',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  cardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  textActive: {
    color: Colors.textDark,
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
  }
});
