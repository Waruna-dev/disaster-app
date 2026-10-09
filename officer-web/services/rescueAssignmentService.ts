import { db } from '../config/firebase';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, doc } from 'firebase/firestore';

export interface RescueAssignment {
  id: string;
  teamId: string;
  teamName: string;
  area: string;
  notes?: string | null;
  status: 'In Progress' | 'Completed';
  createdBy?: string | null;
  createdAt: Timestamp | null;
}

export const createAssignment = async (a: { teamId: string; teamName: string; area: string; notes?: string; createdBy?: string }) => {
  const ref = await addDoc(collection(db, 'rescueAssignments'), {
    ...a, notes: a.notes ?? null, createdBy: a.createdBy ?? null, status: 'In Progress', createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const fetchAssignments = async (): Promise<RescueAssignment[]> => {
  const snap = await getDocs(query(collection(db, 'rescueAssignments'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RescueAssignment));
};

export const completeAssignment = async (id: string) => {
  await updateDoc(doc(db, 'rescueAssignments', id), { status: 'Completed' });
};
