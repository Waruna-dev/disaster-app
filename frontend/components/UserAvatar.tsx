import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size: number;
  borderWidth?: number;
  borderColor?: string;
  loading?: boolean;
  accessibilityLabel?: string;
}

export function UserAvatar({
  imageUrl,
  name,
  size,
  borderWidth = 0,
  borderColor = '#FFFFFF',
  loading = false,
  accessibilityLabel = 'User avatar',
}: UserAvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#E5E7EB', // Default fallback color (gray-200)
    overflow: 'hidden' as const,
  };

  const initial = name ? name.charAt(0).toUpperCase() : null;

  return (
    <View style={containerStyle} accessible={true} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : initial ? (
        <Text style={[styles.initialText, { fontSize: size * 0.4 }]}>{initial}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.6} color="#9CA3AF" />
      )}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  initialText: {
    color: '#4B5563', // gray-600
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill as any, // Spread for TS if absoluteFill is not typed properly as an object
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
