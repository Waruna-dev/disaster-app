import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Text, Alert, ActivityIndicator, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);
import { Colors } from '../../../constants/colors';
import { CreateReportHeader, CreateReportStickyBar } from '../../../components/CreateReportHeader';
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
import { useTranslation } from 'react-i18next';

export default function CreateReportScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

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
      Alert.alert(t('reportCreate.requiredField'), t('reportCreate.provideArea'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('reportCreate.requiredField'), t('reportCreate.enterDescription'));
      return;
    }

    if (!user) {
      Alert.alert('Error', t('reportCreate.errorLoggedIn'));
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
      Alert.alert(t('reportCreate.submissionFailed'), error.message || 'An error occurred while submitting.');
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
      <CreateReportStickyBar scrollY={scrollY} />
      <View style={styles.keyboardView}>
        <AnimatedKeyboardAwareScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={120}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          <CreateReportHeader scrollY={scrollY} />
          <SafetyBanner />

          <DisasterSelector 
            selected={disasterType} 
            onSelect={setDisasterType} 
          />

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{t('reportCreate.affectedAreaLabel')} <Text style={styles.asterisk}>*</Text></Text>
            {isFetchingLocation ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>{t('reportCreate.detectingLocation')}</Text>
              </View>
            ) : (
              <FormInput 
                iconName="location"
                value={affectedArea}
                onChangeText={setAffectedArea}
                placeholder={t('reportCreate.enterAffectedArea')}
              />
            )}
          </View>

          <View style={styles.inputWrapper}>
            <TextAreaInput 
              label={t('reportCreate.shortDescription')}
              placeholder={t('reportCreate.describeHappening')}
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

        </AnimatedKeyboardAwareScrollView>
        
        <View style={styles.footer}>
          <PrimaryButton 
            title={isLoading ? t('reportCreate.submitting') : t('reportCreate.submitReport')} 
            onPress={handleSubmit} 
            disabled={isLoading || isFetchingLocation}
          />
        </View>
      </View>
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
