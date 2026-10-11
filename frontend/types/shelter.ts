import { Timestamp } from 'firebase/firestore';

// Matches what services/shelterService.ts reads/writes at `shelters/{id}`.
export type ShelterStatus = 'Available' | 'Limited' | 'Full' | 'Closed';

export const SHELTER_FACILITIES = [
  'Classrooms',
  'Clean Water',
  'Toilets',
  'Medical Support',
  'Kitchen',
  'Electricity',
  'Accessibility (Disabled Friendly)',
  'Other',
] as const;

export type ShelterFacility = (typeof SHELTER_FACILITIES)[number];

export interface Shelter {
  id: string;
  name: string;
  district: string;
  location: string; // free-text address / location description
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: ShelterStatus;
  notes?: string | null;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Matches what services/shelterRequestService.ts reads/writes at `shelterRequests/{id}`.
export type ShelterRequestStatus = 'Pending' | 'Assigned' | 'Rejected' | 'Completed';

export interface ShelterRequest {
  id: string;
  userId: string;
  userName?: string | null;
  contactNumber?: string | null;
  shelterId?: string | null; // set once assigned by a district officer
  shelterName?: string | null;
  latitude: number;
  longitude: number;
  address: string;
  peopleCount: number;
  description: string;
  status: ShelterRequestStatus;
  district?: string | null;
  officerNotes?: string | null;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}
