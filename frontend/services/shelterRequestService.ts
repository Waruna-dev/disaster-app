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
import { ShelterRequest, ShelterRequestStatus } from '../types/shelter';

const COLLECTION = 'shelterRequests';

export interface ShelterRequestInput {
  userId: string;
  userName?: string;
  contactNumber?: string;
  shelterId?: string;
  shelterName?: string;
  latitude: number;
  longitude: number;
  address: string;
  peopleCount: number;
  description: string;
  district?: string;
}

export const createShelterRequest = async (input: ShelterRequestInput): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    userName: input.userName ?? null,
    contactNumber: input.contactNumber ?? null,
    district: input.district ?? null,
    shelterId: input.shelterId ?? null,
    shelterName: input.shelterName ?? null,
    officerNotes: null,
    status: 'Pending' as ShelterRequestStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const fetchUserShelterRequests = async (userId: string): Promise<ShelterRequest[]> => {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ShelterRequest));
  // Sort client-side (newest first) to avoid requiring a composite index for a simple per-user list.
  return rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
};

export const fetchAllShelterRequests = async (): Promise<ShelterRequest[]> => {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ShelterRequest));
};

export const fetchShelterRequestById = async (id: string): Promise<ShelterRequest | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ShelterRequest;
};

export const assignShelterToRequest = async (
  requestId: string,
  shelterId: string,
  shelterName: string,
  officerNotes?: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status: 'Assigned' as ShelterRequestStatus,
    shelterId,
    shelterName,
    officerNotes: officerNotes ?? null,
    updatedAt: serverTimestamp(),
  });
};

export const updateShelterRequestStatus = async (
  requestId: string,
  status: ShelterRequestStatus,
  officerNotes?: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    ...(officerNotes !== undefined ? { officerNotes } : {}),
    updatedAt: serverTimestamp(),
  });
};
