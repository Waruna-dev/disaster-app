import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { useTranslation } from 'react-i18next';

export default function AlertsScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('alerts.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: Colors.textDark,
  }
});
