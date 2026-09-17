import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

const resources = {
  en: { translation: en },
  si: { translation: si },
  ta: { translation: ta },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    compatibilityJSON: 'v3', // Required for React Native
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load saved language
export const loadLanguage = async () => {
  try {
    const savedLang = await AsyncStorage.getItem('appLanguage');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  } catch (error) {
    console.error('Error loading language', error);
  }
};

// Call it immediately so it resolves as early as possible
loadLanguage();

export default i18n;
