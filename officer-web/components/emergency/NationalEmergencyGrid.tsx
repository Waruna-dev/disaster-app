import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { NATIONAL_EMERGENCY_SERVICES } from '../../constants/emergencyServices';
import { useTranslation } from 'react-i18next';

export const NationalEmergencyGrid = () => {
  const { t } = useTranslation();
  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={styles.gridContainer}>
      {NATIONAL_EMERGENCY_SERVICES.map((service) => (
        <View style={styles.gridCard} key={service.id}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: service.backgroundColor }]}>
              <Ionicons name={service.icon} size={20} color={service.color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {service.id === 'dmc' ? t('emergency.disasterCentre') : 
                 service.id === 'ambulance' ? t('emergency.ambulance') :
                 service.id === 'police' ? t('emergency.police') :
                 service.id === 'fire' ? t('emergency.fireRescue') : service.name}
              </Text>
              <Text style={styles.cardNumber}>{service.phone}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.cardCallButton} 
            onPress={() => handleCall(service.phone)}
            accessibilityLabel={`Call ${service.name} on ${service.phone}`}
          >
            <Ionicons name="call" size={14} color={Colors.white} style={styles.btnIcon} />
            <Text style={styles.btnText}>{t('emergency.callBtn')}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginHorizontal: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardCallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 'auto',
  },
  btnIcon: {
    marginRight: 6,
  },
  btnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
