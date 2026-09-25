import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ToastAndroid, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useLocationHelper } from '../../hooks/useLocationHelper';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

export const ShareLocationCard = () => {
  const { t } = useTranslation();
  const { isGettingLocation, getCurrentLocationMapLink, shareLocation } = useLocationHelper();

  const handleCopyLocation = async () => {
    const mapLink = await getCurrentLocationMapLink(true);
    if (mapLink) {
      await Clipboard.setStringAsync(mapLink);
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('emergency.copySuccessMsg', 'Location link copied to clipboard!'), ToastAndroid.SHORT);
      } else {
        Alert.alert(t('common.success', 'Success'), t('emergency.copySuccessMsg', 'Location link copied to clipboard!'));
      }
    }
  };

  return (
    <TouchableOpacity 
      style={styles.locationBanner} 
      onPress={shareLocation} 
      activeOpacity={0.8}
      disabled={isGettingLocation}
    >
      <View style={styles.locationIconContainer}>
        <Ionicons name="location-outline" size={24} color={Colors.white} />
      </View>
      
      <View style={styles.bannerTextContainer}>
        <Text style={styles.locationTitle}>{t('emergency.shareLocation')}</Text>
        <Text style={styles.locationSubtitle}>
          {t('emergency.shareLocationDesc')}
        </Text>
      </View>

      {isGettingLocation ? (
        <View style={styles.shareActionButton}>
          <ActivityIndicator size="small" color={Colors.white} />
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.shareActionButton} 
          onPress={handleCopyLocation}
          disabled={isGettingLocation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="copy-outline" size={16} color={Colors.white} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  locationBanner: {
    backgroundColor: Colors.primary,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 12,
    color: '#E0FAF1',
  },
  shareActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
