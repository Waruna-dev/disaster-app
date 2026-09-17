import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator, Image, Modal, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [homeArea, setHomeArea] = useState('');
  const [workArea, setWorkArea] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setFullName(profile.fullName || '');
          setEmail(profile.email || user.email || '');
          setAge(profile.age || '');
          setOccupation(profile.occupation || '');
          setHomeArea(profile.homeArea || '');
          setWorkArea(profile.workArea || '');
        }
      } catch (error) {
        console.error('Error loading profile', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      // Update profile info
      await saveUserProfile(user.uid, {
        fullName,
        age,
        occupation,
        homeArea,
        workArea,
        language
      });

      // Update password if provided
      if (newPassword.trim()) {
        await updateUserPassword(newPassword);
        setNewPassword(''); // clear after success
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
      t('editProfile.deleteTitle'),
      t('editProfile.deleteMessage'),
      [
        { text: t('editProfile.cancel'), style: 'cancel' },
        { 
          text: t('editProfile.delete'), 
          style: 'destructive', 
          onPress: async () => {
            if (!user) return;
            try {
              setSaving(true);
              // 1. Delete user doc from firestore
              await deleteUserData(user.uid);
              // 2. Delete auth user
              await deleteUserAccount();
              Alert.alert(t('editProfile.success'), t('editProfile.accountDeleted'));
              // Will trigger onAuthStateChanged to unauthenticated automatically
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
          {/* Placeholder for balance */}
          <View style={styles.iconButton} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <AnimatedKeyboardAwareScrollView 
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
              placeholder={t('register.fullNamePlaceholder')}
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

          {/* Alert areas */}
          <Text style={styles.sectionTitle}>{t('editProfile.alertAreas')}</Text>
          <View style={styles.formGroup}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <FormInput
                  label={t('editProfile.homeArea')}
                  iconName="home-outline"
                  value={homeArea}
                  onChangeText={setHomeArea}
                  placeholder=""
                />
              </View>
              <View style={styles.halfWidth}>
                <FormInput
                  label={t('editProfile.workArea')}
                  iconName="business-outline"
                  value={workArea}
                  onChangeText={setWorkArea}
                  placeholder=""
                />
              </View>
            </View>
            
            <View style={{ marginBottom: 16 }}>
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
            
            <TouchableOpacity 
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>{t('editProfile.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer before footer */}
          <View style={{ height: 40 }} />
        </AnimatedKeyboardAwareScrollView>
      </View>

      {/* Fixed Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <PrimaryButton 
          title={t('editProfile.saveChanges')}
          onPress={handleSave}
          loading={saving}
          icon="checkmark"
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
