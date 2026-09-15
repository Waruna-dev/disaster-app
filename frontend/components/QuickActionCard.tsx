import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface QuickActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'solid' | 'outline';
  onPress: () => void;
}

export function QuickActionCard({ title, subtitle, icon, variant, onPress }: QuickActionCardProps) {
  const isSolid = variant === 'solid';

  return (
    <TouchableOpacity 
      style={[styles.card, isSolid ? styles.cardSolid : styles.cardOutline]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, isSolid ? styles.iconContainerSolid : styles.iconContainerOutline]}>
          <Ionicons 
            name={icon} 
            size={24} 
            color={isSolid ? Colors.white : Colors.primary} 
          />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, isSolid ? styles.titleSolid : styles.titleOutline]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, isSolid ? styles.subtitleSolid : styles.subtitleOutline]}>
            {subtitle}
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isSolid ? Colors.white : Colors.placeholder} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  cardSolid: {
    backgroundColor: Colors.primary,
  },
  cardOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSolid: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconContainerOutline: {
    backgroundColor: '#E8F5F2', // Light green
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleSolid: {
    color: Colors.white,
  },
  titleOutline: {
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 12,
  },
  subtitleSolid: {
    color: Colors.headerSubtitle,
  },
  subtitleOutline: {
    color: Colors.textMuted,
  },
});
