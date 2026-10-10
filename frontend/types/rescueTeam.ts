import { Timestamp } from 'firebase/firestore';

// Matches what services/rescueTeamService.ts reads/writes at `rescueTeams/{id}`.
export const RESCUE_TEAM_TYPES = ['Search & Rescue', 'Medical Support', 'Relief Distribution', 'Logistics'] as const;
export type RescueTeamType = (typeof RESCUE_TEAM_TYPES)[number];

export type RescueTeamStatus = 'Available' | 'On Mission' | 'Unavailable';

export interface RescueTeam {
  id: string;
  name: string;
  type: RescueTeamType;
  district: string;
  members: number;
  equipment?: string | null;
  status: RescueTeamStatus;
  latitude: number;
  longitude: number;
  currentLocationLabel?: string | null;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Matches what services/rescueRequestService.ts reads/writes at `rescueRequests/{id}`.
export type RescueRequestStatus = 'Pending' | 'Assigned' | 'On the way' | 'Pickup' | 'Completed' | 'Rejected';

export interface RescueRequest {
  id: string;
  userId: string;
  userName?: string | null;
  contactNumber: string;
  requestedType: RescueTeamType;
  peopleCount: number;
  latitude: number;
  longitude: number;
  address: string;
  teamId?: string | null;
  teamName?: string | null;
  status: RescueRequestStatus;
  district?: string | null;
  officerNotes?: string | null;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}
