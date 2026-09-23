import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator, Image, Modal, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { HomeArea } from '../../types/location';
import { removeHomeArea } from '../../services/userService';
import { deleteField } from 'firebase/firestore';
import * as Location from 'expo-location';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, saveUserProfile, deleteUserData } from '../../services/userService';
import { updateUserPassword, deleteUserAccount, logoutUser } from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'si', name: 'Sinhala' },
  { code: 'ta', name: 'Tamil' }
];

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const scrollRef = React.useRef<any>(null);
  const [alertAreaY, setAlertAreaY] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [homeArea, setHomeArea] = useState<HomeArea | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] || 'en';

  const scrollY = React.useRef(new Animated.Value(0)).current;
  
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        if (!user) return;
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setFullName(profile.fullName || '');
            setEmail(profile.email || user.email || '');
            setContactNumber(profile.contactNumber || '');
            setAge(profile.age || '');
            setOccupation(profile.occupation || '');
            setHomeArea(profile.homeArea || null);
          }
        } catch (error) {
          console.error('Error loading profile', error);
        } finally {
          setLoading(false);
        }
      };
      loadProfile();
    }, [user])
  );

  useEffect(() => {
    if ((params.scrollTo === 'alertAreas' || params.scrollTo === 'homeArea') && alertAreaY > 0 && !loading) {
      setTimeout(() => {
        if (scrollRef.current) {
          if (typeof scrollRef.current.scrollTo === 'function') {
            scrollRef.current.scrollTo({ y: alertAreaY - 100, animated: true });
          } else if (scrollRef.current.getNode && typeof scrollRef.current.getNode().scrollToPosition === 'function') {
            scrollRef.current.getNode().scrollToPosition(0, alertAreaY - 100, true);
          } else if (typeof scrollRef.current.scrollToPosition === 'function') {
            scrollRef.current.scrollToPosition(0, alertAreaY - 100, true);
          }
        }
      }, 500);
    }
  }, [params.scrollTo, alertAreaY, loading]);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return t('register.passwordTooShort', 'Password must be at least 8 characters.');
    if (!/[A-Z]/.test(pwd)) return t('register.passwordNoUpper', 'Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(pwd)) return t('register.passwordNoLower', 'Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(pwd)) return t('register.passwordNoNumber', 'Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(pwd)) return t('register.passwordNoSpecial', 'Password must contain at least one special character.');
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    
    const sriLankaPhoneRegex = /^(?:0|94|\+94)?(?:7\d{8}|[1-9]\d{8})$/;
    if (contactNumber.trim() && !sriLankaPhoneRegex.test(contactNumber.trim())) {
      Alert.alert(t('editProfile.error') || 'Error', t('editProfile.invalidPhone') || "Please enter a valid Sri Lankan phone number.");
      return;
    }

    try {
      setSaving(true);
      // Update profile info
      await saveUserProfile(user.uid, {
        fullName,
        contactNumber,
        age,
        occupation,
        homeArea,
        language
      });

      // Update password if provided
      if (newPassword.trim()) {
        if (newPassword !== confirmPassword) {
          Alert.alert(t('editProfile.error', 'Error'), t('editProfile.passwordMismatch', 'Passwords do not match.'));
          setSaving(false);
          return;
        }
        
        const pwdError = validatePassword(newPassword);
        if (pwdError) {
          Alert.alert(t('editProfile.error', 'Error'), pwdError);
          setSaving(false);
          return;
        }
        await updateUserPassword(newPassword);
        setNewPassword(''); // clear after success
        setConfirmPassword('');
      }

      Alert.alert(t('editProfile.success'), t('editProfile.profileUpdated'));
    } catch (error: any) {
      console.log('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(t('editProfile.authRequired'), t('editProfile.reloginPassword'));
      } else {
        Alert.alert(t('editProfile.error'), t('editProfile.updateFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('editProfile.deleteTitle') || 'Delete Account',
      t('editProfile.deleteMessage') || 'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: t('editProfile.cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('editProfile.delete') || 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            if (!user) return;
            try {
              setSaving(true);
              // 1. Delete user doc from firestore
              await deleteUserData(user.uid);
              // 2. Delete auth user
              await deleteUserAccount();
              Alert.alert(t('editProfile.success'), t('editProfile.accountDeleted') || 'Account deleted successfully');
              router.replace('/(auth)/register' as any);
            } catch (error: any) {
              console.log('Error deleting account:', error);
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert(t('editProfile.authRequired'), t('editProfile.reloginDelete'));
              } else {
                Alert.alert(t('editProfile.error'), t('editProfile.updateFailed'));
              }
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const headerHeight = 160 + insets.top;

  return (
    <View style={styles.container}>
      {/* Header Background */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight, transform: [{ translateY: headerTranslateY }] }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 402 180`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Path
            d="M0 0 H402 V120 Q201 200 0 120 Z"
            fill={Colors.gradientStart}
          />
        </Svg>
      </Animated.View>

      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
        <View style={[styles.headerBarContent, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
          {/* Spacer to keep title centered */}
          <View style={{ width: 44, height: 44 }} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <AnimatedKeyboardAwareScrollView 
          ref={scrollRef}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight - 50 }]}
          enableOnAndroid={true}
          extraScrollHeight={120}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          
          {/* Profile Avatar Badge */}
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={50} color={Colors.primary} />
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Personal Information */}
          <Text style={styles.sectionTitle}>{t('editProfile.personalInfo')}</Text>
          <View style={styles.formGroup}>
            <FormInput
              label={t('editProfile.fullName')}
              iconName="person-outline"
              value={fullName}
              onChangeText={setFullName}
            />
            
            <FormInput
              label="Contact Number"
              iconName="call-outline"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              placeholder="0712345678"
            />
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <FormInput
                  label={t('editProfile.age')}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="23"
                />
              </View>
              <View style={styles.halfWidth}>
                <FormInput
                  label={t('editProfile.occupation')}
                  value={occupation}
                  onChangeText={setOccupation}
                  placeholder=""
                  iconName="ellipse"
                />
              </View>
            </View>

            <FormInput
              label={t('login.email')}
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              editable={false}
              style={{ opacity: 0.7 }}
            />
          </View>

          {/* Home Area Section */}
          <Text 
            style={styles.sectionTitle}
            onLayout={(e) => setAlertAreaY(e.nativeEvent.layout.y)}
          >
            {t('profile.homeArea', 'Home Area')}
          </Text>
          <View style={styles.formGroup}>
            {homeArea ? (
              <View style={styles.savedHomeCard}>
                <View style={styles.savedHomeIcon}>
                  <Ionicons name="home" size={24} color={Colors.primary} />
                </View>
                <View style={styles.savedHomeDetails}>
                  <Text style={styles.savedHomeName}>{homeArea.name}</Text>
                  <Text style={styles.savedHomeAddress} numberOfLines={2}>{homeArea.address}</Text>
                </View>
                <View style={styles.savedHomeActions}>
                  <TouchableOpacity style={styles.homeActionBtn} onPress={() => router.push('/(user)/select-home-location' as any)}>
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.homeActionBtn} onPress={() => {
                    Alert.alert(
                      t('profile.removeHomeTitle', 'Remove Home Area'),
                      t('profile.removeHomeMsg', 'Are you sure you want to remove your saved home area?'),
                      [
                        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                        { 
                          text: t('common.remove', 'Remove'), 
                          style: 'destructive',
                          onPress: async () => {
                            if (user) {
                              try {
                                await removeHomeArea(user.uid, deleteField);
                                setHomeArea(null);
                              } catch (e) {
                                Alert.alert(t('common.error', 'Error'), t('profile.removeHomeError', 'Could not remove home area.'));
                              }
                            }
                          }
                        }
                      ]
                    );
                  }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noHomeCard}>
                <View style={styles.noHomeHeader}>
                  <Ionicons name="home-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.noHomeTitle}>{t('profile.setHomeArea', 'Set your home area')}</Text>
                </View>
                <View style={styles.noHomeButtons}>
                  <TouchableOpacity 
                    style={styles.homePrimaryBtn} 
                    onPress={async () => {
                      setIsLocating(true);
                      try {
                        let { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert(t('common.permissionDenied', 'Permission denied'), t('profile.locationPermReq', 'Location permission is required.'));
                          setIsLocating(false);
                          return;
                        }
                        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                        const geocode = await Location.reverseGeocodeAsync(coords);
                        let address = 'Unknown Location';
                        let areaName = 'Selected Area';
                        if (geocode && geocode.length > 0) {
                          const place = geocode[0];
                          address = [place.name, place.street, place.district || place.city || place.subregion, place.postalCode].filter(Boolean).join(', ');
                          areaName = place.name || place.street || place.district || 'Current Location';
                        }
                        
                        Alert.alert(
                          'Save Location?',
                          `Do you want to save ${areaName} as your home area?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Save',
                              onPress: async () => {
                                if (user) {
                                  const ha: HomeArea = {
                                    name: areaName,
                                    address: address,
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                    source: 'gps'
                                  };
                                  await saveUserProfile(user.uid, { homeArea: ha, homeAreaUpdatedAt: new Date().toISOString() });
                                  setHomeArea(ha);
                                }
                              }
                            }
                          ]
                        );
                      } catch (error) {
                        Alert.alert(t('common.error', 'Error'), t('profile.locationError', 'Failed to get current location.'));
                      } finally {
                        setIsLocating(false);
                      }
                    }}
                    disabled={isLocating}
                  >
                    {isLocating ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                      <>
                        <Ionicons name="locate" size={18} color={Colors.primary} />
                        <Text style={styles.homePrimaryBtnText}>{t('profile.useCurrentLoc', 'Use current location')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.homeSecondaryBtn} onPress={() => router.push('/(user)/select-home-location' as any)}>
                    <Ionicons name="map-outline" size={18} color={Colors.textDark} />
                    <Text style={styles.homeSecondaryBtnText}>{t('profile.chooseOnMap', 'Choose on map')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={{ marginTop: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 8 }}>{t('Preferred language') || 'Preferred language'}</Text>
              <TouchableOpacity 
                style={styles.languageDropdown}
                activeOpacity={0.7}
                onPress={() => setShowLanguageModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <Ionicons name="language-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: Colors.textDark, flexShrink: 1 }} numberOfLines={1}>
                    {LANGUAGES.find(l => l.code === language)?.name || 'English'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={Colors.placeholder} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Security */}
          <Text style={styles.sectionTitle}>{t('editProfile.security')}</Text>
          <View style={styles.formGroup}>
            <FormInput
              label={t('editProfile.changePassword')}
              iconName="lock-closed-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              placeholder={t('editProfile.newPasswordPlaceholder')}
            />
            {newPassword.length > 0 && (
              <FormInput
                label={t('register.confirmPassword') || 'Confirm Password'}
                iconName="lock-closed-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                placeholder={t('register.confirmPasswordPlaceholder') || 'Confirm your new password'}
              />
            )}
          </View>

          <View style={{ marginTop: 10, marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
            <TouchableOpacity 
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>{t('editProfile.deleteAccount') || 'Delete Account'}</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer to prevent content from hiding behind the fixed footer */}
          <View style={{ height: 100 }} />
        </AnimatedKeyboardAwareScrollView>
      </View>

      {/* Fixed Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <PrimaryButton 
          title={t('editProfile.saveChanges')}
          onPress={handleSave}
          loading={saving}
        />
      </View>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textDark} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map(lang => (
              <TouchableOpacity 
                key={lang.code}
                style={styles.languageOption}
                onPress={() => {
                  setShowLanguageModal(false);
                  Alert.alert(
                    'Change Language',
                    'Are you sure you want to change the app language?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Change',
                        onPress: async () => {
                          await AsyncStorage.setItem('appLanguage', lang.code);
                          await i18n.changeLanguage(lang.code);
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={[styles.languageOptionText, language === lang.code && styles.languageOptionActive]}>
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  savedHomeCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedHomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  savedHomeDetails: {
    flex: 1,
  },
  savedHomeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  savedHomeAddress: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  savedHomeActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  homeActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noHomeCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  noHomeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  noHomeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  homePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F0EC',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  homePrimaryBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  homeSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  homeSecondaryBtnText: {
    color: Colors.textDark,
    fontWeight: '600',
    fontSize: 14,
  },
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  languageOptionText: {
    fontSize: 16,
    color: Colors.textDark,
    flexShrink: 1,
  },
  languageOptionActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 180, // space for footer + keyboard extra space
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 10,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1EAE2',
    borderWidth: 6,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F39C12',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  halfWidth: {
    flex: 1,
    paddingHorizontal: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDEC',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  deleteButtonText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  }
});
