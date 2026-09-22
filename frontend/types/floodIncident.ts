import { Timestamp } from 'firebase/firestore';
import { RiskLevel } from './alert';
import { ReportLocation } from './report';

export type IncidentReviewStatus = 'Pending' | 'Approved' | 'Rejected';

/** The slice of a verified flood Report this feature actually needs. */
export interface FloodIncidentReport {
  id: string;
  referenceNumber: string;
  affectedArea: string;
  location: ReportLocation;
  createdAt: Timestamp | null;
}

/**
 * One auto-detected flood-affected area: a cluster of verified flood reports within
 * 300m of each other (see utils/floodIncidents.ts). Computed client-side on every
 * read of the `reports` collection — nothing here is persisted except the officer's
 * review decision (see FloodIncidentReview below), so the cluster itself always
 * reflects the current set of verified reports.
 */
export interface FloodIncident {
  /** Deterministic hash of the sorted member report IDs — stable across re-renders. */
  id: string;
  affectedArea: string;
  reports: FloodIncidentReport[];
  centroid: ReportLocation;
  /** Convex-hull boundary; null when fewer than 3 distinct coordinates exist (circle fallback applies instead). */
  polygon: ReportLocation[] | null;
  /** Fallback/reference radius in meters, used for the circle when polygon is null. */
  radiusMeters: number;
  riskLevel: RiskLevel;
  /** Most recent member report's createdAt, used as the "generated at" timestamp. */
  generatedAt: Timestamp | null;
}

/**
 * Officer decision for one FloodIncident, keyed by FloodIncident.id and stored in
 * `floodIncidentReviews/{incidentId}` (see services/floodIncidentReviewService.ts).
 * A cluster with no matching doc is implicitly 'Pending'.
 */
export interface FloodIncidentReview {
  status: IncidentReviewStatus;
  reportIds: string[];
  affectedArea: string;
  riskLevel: RiskLevel;
  reviewedBy: string;
  reviewedByName?: string | null;
  reviewedAt: Timestamp | null;
  rejectionReason?: string | null;
  /** Set once "Publish Public Warning" has been used for this incident. */
  warningId?: string | null;
}

export const INCIDENT_REJECTION_REASONS = [
  'Reports already resolved',
  'False cluster / not related',
  'Duplicate of another incident',
  'Insufficient evidence',
  'Other',
] as const;

export type IncidentRejectionReason = (typeof INCIDENT_REJECTION_REASONS)[number];
