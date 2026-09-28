import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Shelter, ShelterStatus } from '../types/shelter';

const COLLECTION = 'shelters';

export interface ShelterInput {
  name: string;
  district: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  status: ShelterStatus;
  notes?: string;
}

/** Derives Available / Limited / Full from occupancy vs capacity unless the officer force-closed it. */
export function deriveShelterStatus(capacity: number, currentOccupancy: number, closed = false): ShelterStatus {
  if (closed) return 'Closed';
  if (capacity <= 0) return 'Full';
  const ratio = currentOccupancy / capacity;
  if (ratio >= 1) return 'Full';
  if (ratio >= 0.85) return 'Limited';
  return 'Available';
}

export const fetchAllShelters = async (): Promise<Shelter[]> => {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('name')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Shelter));
};

export const fetchSheltersByDistrict = async (district: string): Promise<Shelter[]> => {
  const q = query(collection(db, COLLECTION), where('district', '==', district));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Shelter));
};

export const fetchShelterById = async (id: string): Promise<Shelter | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Shelter;
};

export const createShelter = async (input: ShelterInput): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateShelter = async (id: string, input: Partial<ShelterInput>): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

export const deleteShelter = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
