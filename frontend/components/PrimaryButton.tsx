import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { Colors } from '../constants/colors';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export const PrimaryButton = ({ title, loading = false, style, ...props }: PrimaryButtonProps) => {
  return (
    <TouchableOpacity 
      style={[styles.button, style, props.disabled && styles.disabled]} 
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System', // Replace with 'Inter' if loaded
  },
});
