import { Timestamp } from 'firebase/firestore';

export type DisasterType = 'flood' | 'landslide';
export type ReportStatus = 'Pending' | 'Verified' | 'Rejected';

// Matches what services/reportService.ts actually writes to `reports/{id}` (see
// createReport): userId, disasterType, affectedArea, description, photoUrl, status,
// referenceNumber, createdAt. reviewedBy/reviewedAt/rejectionReason are new fields
// the admin review flow adds on top — Firestore has no schema to migrate.
export interface ReportLocation {
  latitude: number;
  longitude: number;
}

export interface Report {
  id: string;
  userId: string;
  disasterType: DisasterType;
  affectedArea: string;
  location?: ReportLocation | null;
  description: string;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  status: ReportStatus;
  referenceNumber: string;
  createdAt: Timestamp | null;
  reviewedBy?: string | null;
  reviewedAt?: Timestamp | null;
  rejectionReason?: string | null;
}

export const REJECTION_REASONS = [
  'False report',
  'Duplicate',
  'Incorrect location',
  'Insufficient evidence',
  'Already resolved',
  'Other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];
