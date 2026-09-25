import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, PanResponder } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { UserMapEngine } from '../../components/UserMapEngine';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile } from '../../services/userService';
import { HomeArea } from '../../types/location';

export default function SelectHomeLocationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const initialLat = params.lat ? parseFloat(params.lat as string) : undefined;
  const initialLng = params.lng ? parseFloat(params.lng as string) : undefined;
  const initialLocation = initialLat && initialLng ? { latitude: initialLat, longitude: initialLng } : undefined;

  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(initialLocation || null);
  const [selectedAddress, setSelectedAddress] = useState<string>('Select a location');
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const cardState = useRef<'open' | 'minimized'>('open');
  const MINIMIZED_OFFSET = 220; // How far down it pushes

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const base = cardState.current === 'open' ? 0 : MINIMIZED_OFFSET;
        let newY = base + gestureState.dy;
        if (newY < 0) newY = 0; // Prevent dragging higher than default
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const isCurrentlyOpen = cardState.current === 'open';
        
        let shouldMinimize = false;
        if (isCurrentlyOpen) {
          if (gestureState.dy > 50 || gestureState.vy > 0.5) {
            shouldMinimize = true;
          }
        } else {
          if (gestureState.dy > 50) {
            shouldMinimize = true;
          } else if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            shouldMinimize = false;
          } else {
            shouldMinimize = true;
          }
        }

        cardState.current = shouldMinimize ? 'minimized' : 'open';
        
        Animated.spring(translateY, {
          toValue: shouldMinimize ? MINIMIZED_OFFSET : 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const handleLocationSelect = (coords: { latitude: number; longitude: number }, address: string, resolving: boolean) => {
    setSelectedLocation(coords);
    setSelectedAddress(address);
    setIsResolving(resolving);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!selectedLocation) {
      Alert.alert(t('common.error', 'Error'), t('profile.selectLocationMsg', 'Please select a location on the map.'));
      return;
    }
    if (isResolving) {
      Alert.alert(t('common.wait', 'Wait'), t('profile.resolvingAddress', 'Still resolving the address, please wait a moment.'));
      return;
    }

    setIsSaving(true);
    try {
      const areaName = selectedAddress.split(',')[0] || 'Unknown Location';
      const homeArea: HomeArea = {
        name: areaName,
        address: selectedAddress,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        source: 'map',
      };
      
      await saveUserProfile(user.uid, {
        homeArea,
        homeAreaUpdatedAt: new Date().toISOString()
      });
      
      router.back();
    } catch (error) {
      console.error('Error saving home area:', error);
      Alert.alert(t('common.error', 'Error'), t('profile.saveFailed', 'Failed to save home area. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: t('profile.setHomeArea', 'Set Home Area'),
          headerShown: false,
        }} 
      />
      
      <UserMapEngine
        mode="home"
        initialLocation={initialLocation}
        onLocationSelect={handleLocationSelect}
        locateMeButtonBottom={320}
      />

      <TouchableOpacity 
        style={[styles.backButton, { top: Math.max(insets.top, 20) + 10 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
      </TouchableOpacity>

      <Animated.View 
        style={[styles.bottomCard, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandle} />
        <Text style={styles.cardTitle}>{t('profile.chooseHomeArea', 'Choose your home area')}</Text>
        <Text style={styles.cardSubtitle}>{t('profile.tapMapHint', 'Tap or drag the map to set your location')}</Text>
        
        <View style={styles.addressBox}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <View style={styles.addressTextContainer}>
            {isResolving ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={styles.addressText}>{selectedAddress}</Text>
            )}
            <Text style={styles.addressSubtext}>{t('profile.selectedLocation', 'Selected Location')}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, (!selectedLocation || isResolving || isSaving) && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!selectedLocation || isResolving || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>{t('profile.saveHomeArea', 'Save home area')}</Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 2,
  },
  addressSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
