import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Colors } from '../../constants/colors';
import { isValidSriLankanPhoneNumber } from '../../utils/phoneNumber';
import { PersonalEmergencyContact } from '../../hooks/useEmergencyContacts';

interface AddEmergencyContactModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (contact: Omit<PersonalEmergencyContact, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  existingContacts: PersonalEmergencyContact[];
}

export const AddEmergencyContactModal: React.FC<AddEmergencyContactModalProps> = ({
  visible,
  onClose,
  onSave,
  existingContacts
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setCategory('');
      setPhone('');
      setError('');
    }
  }, [visible]);

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanCategory = category.trim() || 'Other';
    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (!cleanName) {
      setError('Name is required');
      return;
    }

    if (cleanName.length > 50) {
      setError('Name cannot exceed 50 characters');
      return;
    }

    if (cleanCategory.length > 30) {
      setError('Category cannot exceed 30 characters');
      return;
    }

    if (!isValidSriLankanPhoneNumber(cleanPhone)) {
      setError('Please enter a valid Sri Lankan phone number');
      return;
    }

    const isDuplicate = existingContacts.some(c => c.phone.replace(/[\s-]/g, '') === cleanPhone);
    if (isDuplicate) {
      setError('This contact number already exists');
      return;
    }

    setIsSaving(true);
    const result = await onSave({
      name: cleanName,
      category: cleanCategory,
      phone: cleanPhone
    });
    setIsSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save contact');
    }
  };

  const handleBackgroundPress = () => {
    if (!name && !category && !phone) {
      onClose();
    }
    Keyboard.dismiss();
  };

  const isFormValid = name.trim().length > 0 && isValidSriLankanPhoneNumber(phone.replace(/[\s-]/g, ''));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackgroundPress}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Add Contact</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                maxLength={50}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Category (e.g. Parent, Friend)"
                placeholderTextColor={Colors.textMuted}
                value={category}
                onChangeText={(t) => { setCategory(t); setError(''); }}
                maxLength={30}
              />

              <TextInput
                style={[styles.modalInput, styles.lastInput]}
                placeholder="Contact Number"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(''); }}
                keyboardType="phone-pad"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, (!isFormValid || isSaving) && styles.modalSaveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!isFormValid || isSaving}
                >
                  <Text style={styles.modalSaveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: 16,
    backgroundColor: Colors.inputBg,
  },
  lastInput: {
    marginBottom: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F9F7',
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.textMedium,
    fontWeight: '600',
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: '#82C1B1',
  },
  modalSaveText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
