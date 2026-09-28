import { db } from '../config/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { RejectionReason } from '../types/report';

export class ReportReviewError extends Error {}

/**
 * No Cloud Functions backend exists in this project, so approve/reject run as a
 * client-side Firestore transaction. The `status must still be Pending` guard is
 * what stops two admins double-reviewing the same report.
 */
export async function approveReport(reportId: string, adminId: string): Promise<void> {
  const ref = doc(db, 'reports', reportId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== 'Pending') {
      throw new ReportReviewError('This report is no longer pending review.');
    }
    tx.update(ref, {
      status: 'Verified',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
    });
  });
}

export async function rejectReport(
  reportId: string,
  adminId: string,
  reason: RejectionReason,
  customReason?: string
): Promise<void> {
  const ref = doc(db, 'reports', reportId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== 'Pending') {
      throw new ReportReviewError('This report is no longer pending review.');
    }
    tx.update(ref, {
      status: 'Rejected',
      rejectionReason: reason === 'Other' ? (customReason ?? '') : reason,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
    });
  });
}
