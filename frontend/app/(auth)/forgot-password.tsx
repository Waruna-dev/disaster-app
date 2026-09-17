import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Logo } from '../../components/Logo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { FormInput } from '../../components/FormInput';
import { resetPassword } from '../../services/authService';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert(t('forgotPassword.error'), t('forgotPassword.enterEmail'));
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email.trim());
      Alert.alert(t('forgotPassword.linkSent'), t('forgotPassword.checkEmail'));
      router.back();
    } catch (error: any) {
      Alert.alert(t('forgotPassword.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleRow}>
              <Logo width={28} height={28} variant="solid" />
              <Text style={styles.headerTitle}>{t('forgotPassword.headerTitle')}</Text>
            </View>
          </View>

          {/* Banner */}
          <View style={styles.banner}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Circle cx="15%" cy="20%" r="30" fill="rgba(255,255,255,0.4)" />
              <Path 
                d={`M0,150 Q${width * 0.25},110 ${width * 0.5},130 T${width},90 L${width},250 L0,250 Z`} 
                fill="rgba(255,255,255,0.3)" 
              />
            </Svg>
            
            <View style={styles.iconRingLarge}>
              <View style={styles.iconRingInner}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={48} color={Colors.white} />
                </View>
                {/* Key Badge */}
                <View style={styles.badgeContainer}>
                  <Ionicons name="key-outline" size={18} color={Colors.white} />
                </View>
              </View>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.title}>{t('forgotPassword.title')}</Text>
            <Text style={styles.subtitle}>
              {t('forgotPassword.subtitle')}
            </Text>

            <FormInput
              label={t('forgotPassword.email')}
              placeholder={t('forgotPassword.emailPlaceholder')}
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={styles.primaryBtn} 
              activeOpacity={0.8}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{t('forgotPassword.sendLink')}</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.white} style={styles.btnIcon} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backToLoginRow}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.backToLoginText}>{t('forgotPassword.login')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>

        <View style={styles.footerHint}>
          <Text style={styles.footerHintText}>
            Check your spam folder if the email does not arrive.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#03392E',
    marginLeft: 12,
  },
  banner: {
    backgroundColor: '#E8F5F2',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
  },
  iconRingLarge: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 20,
    borderRadius: 100,
  },
  iconRingInner: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 100,
    position: 'relative',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E69C24',
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#03392E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#738C87',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    position: 'absolute',
    right: 20,
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backToLoginText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  footerHint: {
    backgroundColor: '#F3F9F7',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerHintText: {
    color: '#738C87',
    fontSize: 12,
    textAlign: 'center',
  }
});
