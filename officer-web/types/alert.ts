import { Timestamp } from 'firebase/firestore';
import { DisasterType } from './report';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WarningStatus = 'Active' | 'Expired' | 'Cancelled';

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Radius presets shown on the map picker, in meters.
export const RADIUS_PRESETS = [300, 500, 1000, 2000] as const;

export interface WarningLocation {
  latitude: number;
  longitude: number;
}

// Matches what services/alertService.ts writes to `warnings/{id}` (see
// createWarning). Coordinates + radius are stored flat (not nested) to mirror
// how types/report.ts stores latitude/longitude, so both collections can be
// read with the same map-building utilities.
export interface Warning {
  id: string;
  title: string;
  hazardType: DisasterType;
  riskLevel: RiskLevel;
  affectedArea: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  /** Officer-drawn disaster area boundary from the full-screen Polygon Creator; null when the zone is just a circle. */
  polygon?: WarningLocation[] | null;
  message: string;
  status: WarningStatus;
  createdBy: string;
  createdByName?: string | null;
  sourceReportId?: string | null;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
}
