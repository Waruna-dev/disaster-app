import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';
import { Report, REJECTION_REASONS, RejectionReason } from '../types/report';
import { rejectReport, ReportReviewError } from '../services/reportReviewActions';
import { useAuth } from '../context/AuthContext';

interface RejectReasonDialogProps {
  visible: boolean;
  reports: Report[];
  onClose: () => void;
  onRejected: () => void;
}

// Shared by the Approval screen's inline card action, the Details screen's Reject
// button, and the grouped-review screen's "Reject All" action, so a quick reject
// can't skip the reason requirement. `reports` is a batch of 1+ — rejecting a group
// applies the same reason to every report in it.
export function RejectReasonDialog({ visible, reports, onClose, onRejected }: RejectReasonDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (reports.length === 0) return null;

  const canConfirm = reason !== null && (reason !== 'Other' || customReason.trim().length > 0);

  const reset = () => {
    setReason(null);
    setCustomReason('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!user || !reason || !canConfirm) return;
    setSubmitting(true);
    try {
      await Promise.all(reports.map((r) => rejectReport(r.id, user.uid, reason, customReason.trim())));
      reset();
      onRejected();
    } catch (error) {
      const message =
        error instanceof ReportReviewError
          ? error.message
          : 'Something went wrong while rejecting. Please try again.';
      Alert.alert('Rejection failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{reports.length > 1 ? `Reject ${reports.length} reports` : 'Reject this report'}</Text>
          <Text style={styles.body}>Select a reason. This won't be undone.</Text>

          <ScrollView style={styles.reasonList}>
            {REJECTION_REASONS.map((option) => {
              const isActive = option === reason;
              return (
                <TouchableOpacity key={option} style={styles.reasonRow} activeOpacity={0.7} onPress={() => setReason(option)}>
                  <View style={[styles.radio, isActive && styles.radioActive]}>{isActive && <View style={styles.radioDot} />}</View>
                  <Text style={styles.reasonText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {reason === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Describe the reason"
              placeholderTextColor={Colors.placeholder}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm || submitting}
            >
              {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.confirmText}>Reject</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,61,57,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },
  reasonList: {
    maxHeight: 260,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C9DAD6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.danger,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.textDark,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cancelText: {
    color: Colors.textDark,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
