import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';
import { FloodIncident, INCIDENT_REJECTION_REASONS, IncidentRejectionReason } from '../types/floodIncident';
import { rejectFloodIncident } from '../services/floodIncidentReviewService';
import { useAuth } from '../context/AuthContext';

interface RejectFloodIncidentDialogProps {
  visible: boolean;
  incident: FloodIncident | null;
  onClose: () => void;
  onRejected: () => void;
}

// Mirrors RejectReasonDialog's shape for the flood-incident-polygon feature: rejects
// the *auto-generated affected-area grouping*, not the underlying (already Verified)
// reports, so it writes to floodIncidentReviews instead of reportReviewActions.
export function RejectFloodIncidentDialog({ visible, incident, onClose, onRejected }: RejectFloodIncidentDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<IncidentRejectionReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!incident) return null;

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
      await rejectFloodIncident(incident, user.uid, reason === 'Other' ? (customReason.trim() as IncidentRejectionReason) : reason, user.email);
      reset();
      onRejected();
    } catch {
      Alert.alert('Rejection failed', 'Something went wrong while rejecting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Reject this affected area</Text>
          <Text style={styles.body}>Select a reason. The polygon won't be used for a public warning.</Text>

          <ScrollView style={styles.reasonList}>
            {INCIDENT_REJECTION_REASONS.map((option) => {
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
  overlay: { flex: 1, backgroundColor: 'rgba(20,61,57,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  body: { fontSize: 13, color: Colors.textLight, marginBottom: 16 },
  reasonList: { maxHeight: 260, marginBottom: 12 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C9DAD6', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: Colors.danger },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger },
  reasonText: { fontSize: 14, color: Colors.textDark },
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
  actions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.background },
  cancelText: { color: Colors.textDark, fontWeight: '700' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.danger },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmText: { color: Colors.white, fontWeight: '700' },
});
