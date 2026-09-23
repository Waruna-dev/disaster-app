import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
    } catch (e) {}
    router.push('/(auth)/login');
  };

  const handleRegister = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
    } catch (e) {}
    router.push('/(auth)/register');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="shield" size={16} color={Colors.white} />
          </View>
          <Text style={styles.headerBrand}>FloodGuard</Text>
        </View>
      </View>

      {/* Hero Graphic */}
      <View style={styles.graphicContainer}>
        <View style={styles.heroBackground}>
          <Svg width="100%" height="100%" viewBox="0 0 375 350" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Circle cx="60" cy="60" r="40" fill={Colors.white} fillOpacity={0.15} />
            <Circle cx="320" cy="60" r="25" fill={Colors.primary} fillOpacity={0.15} />
            <Path
              d="M0,250 C100,200 250,300 375,220 L375,350 L0,350 Z"
              fill="rgba(255,255,255,0.2)"
            />
            <Path
              d="M0,280 C120,240 200,320 375,250 L375,350 L0,350 Z"
              fill="rgba(19,167,117,0.05)"
            />
          </Svg>
          
          <View style={styles.shieldLarge}>
            <Svg width="140" height="154" viewBox="0 0 100 110">
              <Path d="M50 0 L90 20 V50 C90 80 50 110 50 110 C50 110 10 80 10 50 V20 Z" fill={Colors.primary} />
              <Path d="M25 45 C35 35 45 45 50 45 C55 45 65 35 75 45 V65 C65 55 55 65 50 65 C45 65 35 55 25 65 Z" fill={Colors.white} />
              <Path d="M25 55 C35 45 45 55 50 55 C55 55 65 45 75 55 V75 C65 65 55 75 50 75 C45 75 35 65 25 75 Z" fill="#B2F5EA" />
            </Svg>
            
            {/* Orange checkmark badge on shield */}
            <View style={styles.shieldBadge}>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
            </View>
          </View>

          {/* Map Pins */}
          <View style={[styles.mapPinContainer, { left: 20, bottom: 40 }]}>
            <View style={styles.mapPin}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.mapPinText}>{t('welcome.kelaniya') || 'Kelaniya'}</Text>
            </View>
          </View>

          <View style={[styles.mapPinContainer, { right: 20, bottom: 40 }]}>
            <View style={styles.mapPin}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.mapPinText}>{t('welcome.malabe') || 'Malabe'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Text Content */}
      <View style={styles.textContent}>
        <Text style={styles.title}>{t('welcome.title') || 'Welcome to FloodGuard'}</Text>
        <Text style={styles.subtitle}>
          {t('welcome.subtitle') || 'Stay informed, report incidents, and help keep your community safe.'}
        </Text>
      </View>

      {/* Buttons */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleLogin}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.login') || 'Log In'}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleRegister}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.createAccount') || 'Create Account'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  graphicContainer: {
    flex: 0.55,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  heroBackground: {
    flex: 1,
    backgroundColor: '#E2F8F1',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldLarge: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  shieldBadge: {
    position: 'absolute',
    top: 0,
    right: 15,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F39C12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2F8F1',
  },
  mapPinContainer: {
    position: 'absolute',
  },
  mapPin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  mapPinText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginLeft: 6,
  },
  textContent: {
    flex: 0.25,
    paddingHorizontal: 32,
    paddingTop: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    flex: 0.2,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  secondaryButton: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
