import { db } from '../config/firebase';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { FloodIncident, FloodIncidentReview, IncidentRejectionReason } from '../types/floodIncident';

const COLLECTION = 'floodIncidentReviews';

/**
 * FloodIncident.id is a deterministic hash of its member report IDs (see
 * utils/floodIncidents.ts), so it's stable across sessions as long as cluster
 * membership doesn't change — that's what makes it safe to use directly as the
 * Firestore doc ID for this incident's review decision.
 */
export function subscribeFloodIncidentReviews(
  onChange: (reviews: Record<string, FloodIncidentReview>) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const reviews: Record<string, FloodIncidentReview> = {};
      snapshot.docs.forEach((d) => {
        reviews[d.id] = d.data() as FloodIncidentReview;
      });
      onChange(reviews);
    },
    (err) => onError?.(err)
  );
}

export async function approveFloodIncident(
  incident: FloodIncident,
  adminId: string,
  adminName?: string | null
): Promise<void> {
  await setDoc(doc(db, COLLECTION, incident.id), {
    status: 'Approved',
    reportIds: incident.reports.map((r) => r.id),
    affectedArea: incident.affectedArea,
    riskLevel: incident.riskLevel,
    reviewedBy: adminId,
    reviewedByName: adminName ?? null,
    reviewedAt: serverTimestamp(),
    rejectionReason: null,
  });
}

export async function rejectFloodIncident(
  incident: FloodIncident,
  adminId: string,
  reason: IncidentRejectionReason,
  adminName?: string | null
): Promise<void> {
  await setDoc(doc(db, COLLECTION, incident.id), {
    status: 'Rejected',
    reportIds: incident.reports.map((r) => r.id),
    affectedArea: incident.affectedArea,
    riskLevel: incident.riskLevel,
    reviewedBy: adminId,
    reviewedByName: adminName ?? null,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason,
  });
}

/** Marks an approved incident as having produced a public warning, without changing its status. */
export async function linkFloodIncidentWarning(incidentId: string, warningId: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, incidentId), { warningId }, { merge: true });
}
