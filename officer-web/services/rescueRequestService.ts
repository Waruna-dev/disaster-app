import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { RescueRequest, RescueRequestStatus, RescueTeamType } from '../types/rescueTeam';

const COLLECTION = 'rescueRequests';

export interface RescueRequestInput {
  userId: string;
  userName?: string;
  contactNumber: string;
  requestedType: RescueTeamType;
  peopleCount: number;
  latitude: number;
  longitude: number;
  address: string;
  district?: string;
  preferredTeamId?: string;
  preferredTeamName?: string;
}

export const createRescueRequest = async (input: RescueRequestInput): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    userName: input.userName ?? null,
    district: input.district ?? null,
    teamId: null,
    teamName: null,
    preferredTeamId: input.preferredTeamId ?? null,
    preferredTeamName: input.preferredTeamName ?? null,
    officerNotes: null,
    status: 'Pending' as RescueRequestStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const fetchUserRescueRequests = async (userId: string): Promise<RescueRequest[]> => {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RescueRequest));
  return rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
};

export const fetchAllRescueRequests = async (): Promise<RescueRequest[]> => {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RescueRequest));
};

export const fetchRescueRequestById = async (id: string): Promise<RescueRequest | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RescueRequest;
};

export const assignTeamToRequest = async (
  requestId: string,
  teamId: string,
  teamName: string,
  officerNotes?: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status: 'Assigned' as RescueRequestStatus,
    teamId,
    teamName,
    officerNotes: officerNotes ?? null,
    updatedAt: serverTimestamp(),
  });
};

export const updateRescueRequestStatus = async (
  requestId: string,
  status: RescueRequestStatus,
  officerNotes?: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    ...(officerNotes !== undefined ? { officerNotes } : {}),
    updatedAt: serverTimestamp(),
  });
};
