import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { FloodIncident } from '../types/floodIncident';
import { approveFloodIncident } from '../services/floodIncidentReviewService';
import { useAuth } from '../context/AuthContext';

interface ApproveFloodIncidentDialogProps {
  visible: boolean;
  incident: FloodIncident | null;
  onClose: () => void;
  onApproved: () => void;
}

// Mirrors ApproveConfirmDialog's shape, but approving here doesn't touch the
// `reports` collection (the member reports are already Verified) — it records that
// an officer signed off on the *auto-generated affected-area polygon* itself, which
// is what unlocks "Publish Public Warning" on the incident detail screen.
export function ApproveFloodIncidentDialog({ visible, incident, onClose, onApproved }: ApproveFloodIncidentDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (!incident) return null;

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await approveFloodIncident(incident, user.uid, user.email);
      onApproved();
    } catch {
      Alert.alert('Approval failed', 'Something went wrong while approving. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Approve this affected area?</Text>
          <Text style={styles.body}>
            This confirms the auto-generated polygon for <Text style={styles.bold}>{incident.affectedArea}</Text> (
            {incident.reports.length} reports, {incident.riskLevel} risk) is accurate. You can publish a public warning for it afterwards.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={submitting}>
              {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.confirmText}>Approve</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,61,57,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  body: { fontSize: 14, color: Colors.textLight, lineHeight: 20, marginBottom: 24 },
  bold: { fontWeight: '700', color: Colors.textDark },
  actions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.background },
  cancelText: { color: Colors.textDark, fontWeight: '700' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary },
  confirmText: { color: Colors.white, fontWeight: '700' },
});
