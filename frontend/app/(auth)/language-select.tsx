import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, ClipPath } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Logo } from '../../components/Logo';

type LanguageOption = {
  id: string;
  code: string;
  name: string;
};

const LANGUAGES: LanguageOption[] = [
  { id: 'en', code: 'EN', name: 'English' },
  { id: 'si', code: 'SI', name: 'Sinhala' },
  { id: 'ta', code: 'TA', name: 'Tamil' },
];

export default function LanguageSelectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem('appLanguage', selectedLang);
      await AsyncStorage.setItem('hasSelectedLanguage', 'true');
      await i18n.changeLanguage(selectedLang);
      // Navigate to login after language selection
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Error saving language preference:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderLanguageOption = (lang: LanguageOption) => {
    const isSelected = selectedLang === lang.id;
    return (
      <TouchableOpacity
        key={lang.id}
        style={[styles.langCard, isSelected && styles.langCardSelected]}
        onPress={() => {
          setSelectedLang(lang.id);
          i18n.changeLanguage(lang.id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.langCode, isSelected && styles.langCodeSelected]}>
          <Text style={[styles.langCodeText, isSelected && styles.langCodeTextSelected]}>
            {lang.code}
          </Text>
        </View>
        <Text style={styles.langName}>{lang.name}</Text>
        <View style={styles.checkCircle}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Logo width={20} height={20} color={Colors.white} />
            </View>
            <Text style={styles.brandText}>FloodGuard</Text>
          </View>

          {/* Illustration Container */}
          <View style={styles.illustrationContainer}>
            {/* Background Wavy blob */}
            <View style={styles.blobBackground}>
              <Svg width="100%" height="100%" viewBox="0 0 340 280" preserveAspectRatio="none">
                <Path
                  d="M0,280 L0,220 Q80,180 170,230 T340,190 L340,280 Z"
                  fill="rgba(209, 234, 226, 0.4)"
                />
                <Path
                  d="M0,280 L0,250 Q100,200 180,260 T340,210 L340,280 Z"
                  fill="rgba(209, 234, 226, 0.7)"
                />
                <Circle cx="50" cy="50" r="30" fill="rgba(255,255,255,0.4)" />
              </Svg>
            </View>

            {/* The Globe */}
            <View style={styles.globeWrapper}>
              <Svg width="140" height="140" viewBox="0 0 140 140">
                <Circle cx="70" cy="70" r="70" fill={Colors.primary} />
                {/* Latitude Lines */}
                <Path d="M6 35 Q70 65 134 35" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                <Path d="M0 70 L140 70" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                <Path d="M6 105 Q70 75 134 105" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                {/* Longitude Lines */}
                <Path d="M35 6 Q65 70 35 134" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                <Path d="M70 0 L70 140" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                <Path d="M105 6 Q75 70 105 134" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
              </Svg>
            </View>

            {/* Floating Language Bubbles */}
            <View style={[styles.floatingBubble, { top: 40, left: 40 }]}>
              <Text style={styles.bubbleText}>EN</Text>
            </View>
            <View style={[styles.floatingBubble, { top: 40, right: 30 }]}>
              <Text style={styles.bubbleText}>SI</Text>
            </View>
            <View style={[styles.floatingBubble, { bottom: 20, right: 40 }]}>
              <Text style={styles.bubbleText}>TA</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title}>{t('languageSelect.title')}</Text>
          <Text style={styles.subtitle}>{t('languageSelect.subtitle')}</Text>

          <View style={styles.listContainer}>
            {LANGUAGES.map(renderLanguageOption)}
          </View>

          <Text style={styles.footerNote}>
            {t('languageSelect.footerNote')}
          </Text>

          <PrimaryButton 
            title={t('languageSelect.continue')}
            onPress={handleContinue}
            loading={saving}
            icon="chevron-forward"
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
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
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  illustrationContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#E8F6F3',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  globeWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  floatingBubble: {
    position: 'absolute',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.placeholder,
    textAlign: 'center',
    marginBottom: 32,
  },
  listContainer: {
    marginBottom: 24,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  langCardSelected: {
    borderColor: Colors.primary,
  },
  langCode: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  langCodeSelected: {
    backgroundColor: Colors.primary,
  },
  langCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  langCodeTextSelected: {
    color: Colors.white,
  },
  langName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  checkCircle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  footerNote: {
    fontSize: 13,
    color: Colors.placeholder,
    textAlign: 'center',
    marginBottom: 20,
  }
});
