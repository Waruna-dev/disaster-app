import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '../constants/colors';

interface TextAreaInputProps extends TextInputProps {
  label?: string;
  maxLength?: number;
}

export const TextAreaInput = ({ label, maxLength, style, value, onChangeText, ...props }: TextAreaInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  // Use internal state only if value is not provided as a prop (uncontrolled mode)
  const [internalText, setInternalText] = useState('');
  
  const currentText = value !== undefined ? value : internalText;

  const handleChangeText = (val: string) => {
    if (value === undefined) {
      setInternalText(val);
    }
    if (onChangeText) {
      onChangeText(val);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label} <Text style={styles.asterisk}>*</Text></Text> : null}
      
      <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          textAlignVertical="top"
          maxLength={maxLength}
          onChangeText={handleChangeText}
          value={currentText}
          {...props}
        />
        <Text style={styles.counterText}>
          {currentText.length} / {maxLength}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    width: '100%',
    /* paddingHorizontal: 24, */
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  asterisk: {
    color: Colors.danger,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    padding: 16,
    height: 120, // fixed height for text area
    position: 'relative',
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textDark,
  },
  counterText: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: Colors.textMuted,
  }
});
