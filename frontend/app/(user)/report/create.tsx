import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Text, Alert, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);
import { Colors } from '../../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { CreateReportHeader, CreateReportStickyBar } from '../../../components/CreateReportHeader';
import { SafetyBanner } from '../../../components/SafetyBanner';
import { DisasterSelector } from '../../../components/DisasterSelector';
import { FormInput } from '../../../components/FormInput';
import { TextAreaInput } from '../../../components/TextAreaInput';
import { PhotoUploadCard } from '../../../components/PhotoUploadCard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';

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

  const { lat, lng, address } = useLocalSearchParams<{ lat?: string, lng?: string, address?: string }>();
  const [reportCoords, setReportCoords] = useState<{ latitude: number, longitude: number } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    if (lat && lng) {
      setReportCoords({
        latitude: Number(lat),
        longitude: Number(lng),
      });
    }
    if (address) {
      setAffectedArea(address);
    }
    setIsFetchingLocation(false);
  }, [lat, lng, address]);

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

      const reportId = await createReport({
        userId: user.uid,
        disasterType,
        affectedArea: affectedArea.trim(),
        description: description.trim(),
        photoUrls: uploadedUrls,
        latitude: reportCoords?.latitude,
        longitude: reportCoords?.longitude,
      });

      // Navigate to success screen with params
      router.replace({
        pathname: '/(user)/report/success',
        params: { referenceNumber: reportId, disasterType, affectedArea: affectedArea.trim() }
      });

    } catch (error: any) {
      Alert.alert(t('reportCreate.submissionFailed'), error.message || 'An error occurred while submitting.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (uri: string | string[]) => {
    if (Array.isArray(uri)) {
      setPhotoUris(prev => [...prev, ...uri].slice(0, 3));
    } else {
      if (photoUris.length < 3) {
        setPhotoUris(prev => [...prev, uri]);
      }
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
            ) : lat && lng ? (
              <View style={styles.readOnlyLocationBox}>
                <View style={styles.readOnlyLocationContent}>
                  <Ionicons name="location" size={20} color={Colors.primary} />
                  <Text style={styles.readOnlyLocationText}>{affectedArea}</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.changeLocationText}>Change</Text>
                </TouchableOpacity>
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
    color: Colors.textMuted,
    marginLeft: 8,
  },
  readOnlyLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
  },
  readOnlyLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readOnlyLocationText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  changeLocationText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
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
