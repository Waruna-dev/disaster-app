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
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { Shelter, ShelterRequest, ShelterRequestStatus } from '../types/shelter';
import { deriveShelterStatus } from './shelterService';

const COLLECTION = 'shelterRequests';

export const syncShelterOccupanciesFromAssignedRequests = async (): Promise<void> => {
  const [requestSnapshot, shelterSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTION)),
    getDocs(collection(db, 'shelters')),
  ]);
  const occupancyByShelter = new Map<string, number>();

  requestSnapshot.docs.forEach((requestDoc) => {
    const request = requestDoc.data() as ShelterRequest;
    if (request.status !== 'Assigned' || !request.shelterId) return;
    const peopleCount = Math.max(0, Number(request.peopleCount) || 0);
    occupancyByShelter.set(request.shelterId, (occupancyByShelter.get(request.shelterId) || 0) + peopleCount);
  });

  const batch = writeBatch(db);
  shelterSnapshot.docs.forEach((shelterDoc) => {
    const shelter = shelterDoc.data() as Shelter;
    const capacity = Math.max(0, Number(shelter.capacity) || 0);
    const currentOccupancy = occupancyByShelter.get(shelterDoc.id) || 0;
    batch.update(shelterDoc.ref, {
      currentOccupancy,
      status: deriveShelterStatus(capacity, currentOccupancy, shelter.status === 'Closed'),
      updatedAt: serverTimestamp(),
    });
  });

  if (shelterSnapshot.docs.length > 0) await batch.commit();
};

export interface ShelterRequestInput {
  userId: string;
  userName?: string;
  contactNumber?: string;
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
    shelterId: null,
    shelterName: null,
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
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, COLLECTION, requestId);
    const shelterRef = doc(db, 'shelters', shelterId);
    const requestSnap = await transaction.get(requestRef);
    const shelterSnap = await transaction.get(shelterRef);

    if (!requestSnap.exists()) throw new Error('Shelter request no longer exists.');
    if (!shelterSnap.exists()) throw new Error('Selected shelter no longer exists.');

    const request = requestSnap.data() as ShelterRequest;
    const shelter = shelterSnap.data();
    const peopleCount = Math.max(0, Number(request.peopleCount) || 0);
    const capacity = Number(shelter.capacity) || 0;
    const currentOccupancy = Number(shelter.currentOccupancy) || 0;

    if (request.status !== 'Pending') throw new Error('This request has already been processed.');
    if (shelter.status === 'Closed' || currentOccupancy + peopleCount > capacity) {
      throw new Error('This shelter does not have enough available capacity.');
    }

    transaction.update(shelterRef, {
      currentOccupancy: currentOccupancy + peopleCount,
      status: deriveShelterStatus(capacity, currentOccupancy + peopleCount),
      updatedAt: serverTimestamp(),
    });
    transaction.update(requestRef, {
      status: 'Assigned' as ShelterRequestStatus,
      shelterId,
      shelterName,
      officerNotes: officerNotes ?? null,
      updatedAt: serverTimestamp(),
    });
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
