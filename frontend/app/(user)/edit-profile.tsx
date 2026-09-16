import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image } from 'react-native';
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

export default function EditProfileScreen() {
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
  const [language, setLanguage] = useState('English');
  const [newPassword, setNewPassword] = useState('');

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
          setLanguage(profile.language || 'English');
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

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.log('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Authentication Required', 'Changing your password requires you to log in again recently. Please log out and log back in.');
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            if (!user) return;
            try {
              setSaving(true);
              // 1. Delete user doc from firestore
              await deleteUserData(user.uid);
              // 2. Delete auth user
              await deleteUserAccount();
              Alert.alert('Success', 'Your account has been deleted.');
              // Will trigger onAuthStateChanged to unauthenticated automatically
            } catch (error: any) {
              console.log('Error deleting account:', error);
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert('Authentication Required', 'Deleting your account requires you to log in again recently. Please log out and log back in.');
              } else {
                Alert.alert('Error', 'Failed to delete account.');
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
      <View style={[styles.headerContainer, { height: headerHeight }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 402 180`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Path
            d="M0 0 H402 V120 Q201 200 0 120 Z"
            fill={Colors.gradientStart}
          />
        </Svg>
      </View>

      {/* Custom Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        {/* Placeholder for balance */}
        <View style={styles.iconButton} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight - 50 }]}>
          
          {/* Profile Avatar Badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={50} color={Colors.primary} />
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Information */}
          <Text style={styles.sectionTitle}>Personal information</Text>
          <View style={styles.formGroup}>
            <FormInput
              label="Full name"
              iconName="person-outline"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <FormInput
                  label="Age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="23"
                />
              </View>
              <View style={styles.halfWidth}>
                <FormInput
                  label="Occupation"
                  value={occupation}
                  onChangeText={setOccupation}
                  placeholder="Student"
                  iconName="ellipse"
                />
              </View>
            </View>

            <FormInput
              label="Email address"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              editable={false}
              style={{ opacity: 0.7 }}
            />
          </View>

          {/* Alert areas */}
          <Text style={styles.sectionTitle}>Alert areas</Text>
          <View style={styles.formGroup}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <FormInput
                  label="Home area"
                  iconName="home-outline"
                  value={homeArea}
                  onChangeText={setHomeArea}
                  placeholder="e.g. Kelaniya"
                />
              </View>
              <View style={styles.halfWidth}>
                <FormInput
                  label="Work area"
                  iconName="business-outline"
                  value={workArea}
                  onChangeText={setWorkArea}
                  placeholder="e.g. Malabe"
                />
              </View>
            </View>
            
            <FormInput
              label="Preferred language"
              iconName="language-outline"
              value={language}
              onChangeText={setLanguage}
              placeholder="English"
            />
          </View>

          {/* Security */}
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.formGroup}>
            <FormInput
              label="Change Password"
              iconName="lock-closed-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              placeholder="Enter new password"
            />
            
            <TouchableOpacity 
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer before footer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <PrimaryButton 
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          icon="checkmark"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 20,
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
    paddingBottom: 120, // space for footer
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
