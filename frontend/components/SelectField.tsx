import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string | null;
  options: readonly string[];
  onSelect: (value: string) => void;
}

export function SelectField({ label, placeholder = 'Select…', value, options, onSelect }: SelectFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={() => setVisible(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.iconColor} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label || placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>{item}</Text>
                  {item === value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMedium, marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, backgroundColor: Colors.inputBg, paddingHorizontal: 16, height: 56 },
  fieldText: { fontSize: 14, color: Colors.textDark },
  placeholder: { color: Colors.placeholder },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F5F4' },
  optionText: { fontSize: 14, color: Colors.textMedium },
  optionTextActive: { color: Colors.primary, fontWeight: '700' },
});
