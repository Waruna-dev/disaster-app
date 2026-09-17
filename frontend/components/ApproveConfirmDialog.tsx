import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { Report } from '../types/report';
import { approveReport, ReportReviewError } from '../services/reportReviewActions';
import { useAuth } from '../context/AuthContext';

interface ApproveConfirmDialogProps {
  visible: boolean;
  report: Report | null;
  onClose: () => void;
  onApproved: () => void;
}

// Shared by the Approval screen's inline card action and the Details screen's Approve
// button, so both entry points show identical confirmation copy.
export function ApproveConfirmDialog({ visible, report, onClose, onApproved }: ApproveConfirmDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const disasterLabel = report.disasterType === 'flood' ? 'flood' : 'landslide';

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await approveReport(report.id, user.uid);
      onApproved();
    } catch (error) {
      const message =
        error instanceof ReportReviewError
          ? error.message
          : 'Something went wrong while approving this report. Please try again.';
      Alert.alert('Approval failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Approve this report?</Text>
          <Text style={styles.body}>
            This will mark the {disasterLabel} report in {report.affectedArea} ({report.referenceNumber}) as{' '}
            <Text style={styles.bold}>Verified</Text>.
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 24,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textDark,
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
    backgroundColor: Colors.primary,
  },
  confirmText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
