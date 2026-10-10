import type { Timestamp } from 'firebase/firestore';

export type TS = Timestamp | null;

/* Shapes below match exactly what the citizen mobile app reads/writes in Firestore. */
export type ShelterStatus = 'Available' | 'Limited' | 'Full' | 'Closed';
export interface Shelter {
  id: string; name: string; district: string; location: string; latitude: number; longitude: number;
  capacity: number; currentOccupancy: number; facilities: string[]; status: ShelterStatus; notes?: string | null;
  createdAt: TS; updatedAt?: TS;
}
export type ShelterRequestStatus = 'Pending' | 'Assigned' | 'Rejected' | 'Completed';
export interface ShelterRequest {
  id: string; userId: string; userName?: string | null; contactNumber?: string | null; shelterId?: string | null; shelterName?: string | null;
  preferredShelterId?: string | null; preferredShelterName?: string | null; affectedArea?: string | null;
  latitude: number; longitude: number; address: string; peopleCount: number; description: string;
  status: ShelterRequestStatus; district?: string | null; officerNotes?: string | null; createdAt: TS; updatedAt?: TS;
}

export type RescueTeamType = 'Search & Rescue' | 'Medical Support' | 'Relief Distribution' | 'Logistics';
export type RescueTeamStatus = 'Available' | 'On Mission' | 'Unavailable';
export interface RescueTeam {
  id: string; name: string; type: RescueTeamType; district: string; members: number; equipment?: string | null;
  status: RescueTeamStatus; latitude: number; longitude: number; currentLocationLabel?: string | null; createdAt: TS; updatedAt?: TS;
}
export type RescueRequestStatus = 'Pending' | 'Assigned' | 'On the way' | 'Pickup' | 'Completed' | 'Rejected';
export interface RescueRequest {
  id: string; userId: string; userName?: string | null; contactNumber: string; requestedType: RescueTeamType; peopleCount: number;
  latitude: number; longitude: number; address: string; teamId?: string | null; teamName?: string | null;
  status: RescueRequestStatus; district?: string | null; officerNotes?: string | null; createdAt: TS; updatedAt?: TS;
}
export interface RescueAssignment {
  id: string; teamId: string; teamName: string; area: string; notes?: string | null; status: 'In Progress' | 'Completed'; createdBy?: string | null; createdAt: TS;
}

export interface Resource {
  id: string; name: string; category: string; unit: string; totalQuantity: number; availableQuantity: number; createdAt: TS; updatedAt?: TS;
}
export interface ResourceDistribution {
  id: string; resourceId: string; resourceName: string; category?: string | null; unit: string; quantity: number; district: string;
  distributionDate: string; notes?: string | null; recordedBy?: string | null; createdAt: TS;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WarningStatus = 'Active' | 'Expired' | 'Cancelled';
export interface Warning {
  id: string; title: string; hazardType: string; riskLevel: RiskLevel; affectedArea: string; latitude: number; longitude: number; radius: number;
  polygon?: { latitude: number; longitude: number }[] | null; message: string; status: WarningStatus; createdBy: string;
  createdByName?: string | null; createdAt: TS; expiresAt: TS;
}

export type ActivityStatus = 'Success' | 'Info' | 'In Progress' | 'Completed';
export interface Activity {
  id: string; type: 'shelter' | 'rescue' | 'resource' | 'alert' | 'notification'; title: string; detail: string;
  location?: string | null; status: ActivityStatus; createdBy?: string | null; createdAt: TS;
}

export interface UserProfile { id: string; fullName?: string; email?: string; role?: string; contactNumber?: string }
