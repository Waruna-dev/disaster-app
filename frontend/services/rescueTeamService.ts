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
import { RescueTeam, RescueTeamStatus, RescueTeamType } from '../types/rescueTeam';

const COLLECTION = 'rescueTeams';

export interface RescueTeamInput {
  name: string;
  type: RescueTeamType;
  district: string;
  members: number;
  equipment?: string;
  status: RescueTeamStatus;
  latitude: number;
  longitude: number;
  currentLocationLabel?: string;
}

export const fetchAllRescueTeams = async (): Promise<RescueTeam[]> => {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('name')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RescueTeam));
};

export const fetchRescueTeamsByDistrict = async (district: string): Promise<RescueTeam[]> => {
  const q = query(collection(db, COLLECTION), where('district', '==', district));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RescueTeam));
};

export const fetchRescueTeamById = async (id: string): Promise<RescueTeam | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RescueTeam;
};

export const createRescueTeam = async (input: RescueTeamInput): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    equipment: input.equipment ?? null,
    currentLocationLabel: input.currentLocationLabel ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateRescueTeam = async (id: string, input: Partial<RescueTeamInput>): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

export const deleteRescueTeam = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
