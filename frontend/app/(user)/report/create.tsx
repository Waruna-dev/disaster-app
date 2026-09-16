import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../../constants/colors';
import { CreateReportHeader } from '../../../components/CreateReportHeader';
import { SafetyBanner } from '../../../components/SafetyBanner';
import { DisasterSelector } from '../../../components/DisasterSelector';
import { FormInput } from '../../../components/FormInput';
import { TextAreaInput } from '../../../components/TextAreaInput';
import { PhotoUploadCard } from '../../../components/PhotoUploadCard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useFocusEffect, router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../../context/AuthContext';
import { createReport, uploadReportPhoto } from '../../../services/reportService';

export default function CreateReportScreen() {
  const { user } = useAuth();
  const scrollRef = React.useRef<ScrollView>(null);

  const [disasterType, setDisasterType] = useState<'flood' | 'landslide'>('flood');
  const [affectedArea, setAffectedArea] = useState('');
  const [description, setDescription] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsFetchingLocation(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          // Try to get a meaningful area name
          const areaName = [place.name, place.street, place.district || place.city || place.subregion, place.postalCode].filter(Boolean).join(', ');
          if (areaName) {
            setAffectedArea(areaName);
          }
        }
      } catch (error) {
        console.log("Location error: ", error);
      } finally {
        setIsFetchingLocation(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!affectedArea.trim()) {
      Alert.alert('Required Field', 'Please provide the affected area.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a short description.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a report.');
      return;
    }

    try {
      setIsLoading(true);

      let uploadedUrls: string[] = [];
      if (photoUris.length > 0) {
        const uploadPromises = photoUris.map(uri => uploadReportPhoto(uri));
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const referenceNumber = await createReport({
        userId: user.uid,
        disasterType,
        affectedArea: affectedArea.trim(),
        description: description.trim(),
        photoUrls: uploadedUrls
      });

      // Navigate to success screen with params
      router.replace({
        pathname: '/(user)/report/success',
        params: { referenceNumber, disasterType, affectedArea: affectedArea.trim() }
      });

    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'An error occurred while submitting.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (uri: string) => {
    if (photoUris.length < 3) {
      setPhotoUris([...photoUris, uri]);
    }
  };

  const handlePhotoRemove = (index: number) => {
    const newUris = [...photoUris];
    newUris.splice(index, 1);
    setPhotoUris(newUris);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CreateReportHeader />
          <SafetyBanner />

          <DisasterSelector 
            selected={disasterType} 
            onSelect={setDisasterType} 
          />

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Affected area <Text style={styles.asterisk}>*</Text></Text>
            {isFetchingLocation ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Detecting location...</Text>
              </View>
            ) : (
              <FormInput 
                iconName="location"
                value={affectedArea}
                onChangeText={setAffectedArea}
                placeholder="Enter affected area"
              />
            )}
          </View>

          <View style={styles.inputWrapper}>
            <TextAreaInput 
              label="Short description"
              placeholder="Describe what is happening..."
              maxLength={200}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputWrapper}>
            <PhotoUploadCard 
              photoUris={photoUris}
              onPhotoSelect={handlePhotoSelect}
              onPhotoRemove={handlePhotoRemove}
            />
          </View>

        </ScrollView>
        
        <View style={styles.footer}>
          <PrimaryButton 
            title={isLoading ? "Submitting..." : "Submit report"} 
            onPress={handleSubmit} 
            disabled={isLoading || isFetchingLocation}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24, // extra padding before footer
  },
  inputWrapper: {
    paddingHorizontal: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  asterisk: {
    color: Colors.danger,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
  },
  loadingArea: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 12,
    color: Colors.textMedium,
    fontSize: 14,
  }
});
