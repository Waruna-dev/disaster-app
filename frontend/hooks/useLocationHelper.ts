import { useState, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform, ToastAndroid, Share } from 'react-native';

export const useLocationHelper = () => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const locationRequestRef = useRef(false);

  const getCurrentLocationMapLink = async (showToast: boolean = false): Promise<string | null> => {
    if (locationRequestRef.current) return null;
    
    try {
      locationRequestRef.current = true;
      setIsGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to share your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = location.coords;
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      
      return mapLink;
    } catch (error) {
      if (showToast) {
        Alert.alert('Location Error', 'Could not retrieve your current location. Please check your GPS and try again.');
      }
      return null;
    } finally {
      setIsGettingLocation(false);
      locationRequestRef.current = false;
    }
  };

  const shareLocation = async () => {
    const mapLink = await getCurrentLocationMapLink(true);
    if (mapLink) {
      try {
        await Share.share({
          title: 'My current location',
          message: `This is my current location: ${mapLink}`,
          url: mapLink,
        });
      } catch (error) {
        console.error('Error sharing location:', error);
      }
    }
  };

  return {
    isGettingLocation,
    getCurrentLocationMapLink,
    shareLocation
  };
};
