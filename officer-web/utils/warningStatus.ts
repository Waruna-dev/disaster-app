import { Warning } from '../types/alert';

export type DisplayWarningStatus = 'Active' | 'Expired' | 'Cancelled';

/**
 * A stored status of "Active" only means nobody's cancelled it yet — the expiry
 * clock is independent, so a warning past its own expiresAt reads as Expired here
 * even though the Firestore doc still says Active. Shared by the Public Warnings
 * list (app/(DMC)/alerts.tsx) and Create Public Warning's "already published"
 * map overlay (app/(DMC)/create-alert.tsx) so the two screens can't disagree on
 * what counts as active.
 */
export function getWarningStatus(warning: Warning): DisplayWarningStatus {
  if (warning.status === 'Cancelled') return 'Cancelled';
  if (warning.expiresAt && warning.expiresAt.toDate().getTime() < Date.now()) return 'Expired';
  return 'Active';
}
