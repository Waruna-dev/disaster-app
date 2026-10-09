import { db } from '../config/firebase';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';

export type ActivityStatus = 'Success' | 'Info' | 'In Progress' | 'Completed';
export interface Activity {
  id: string;
  type: 'shelter' | 'rescue' | 'resource' | 'alert' | 'notification';
  title: string;
  detail: string;
  location?: string | null;
  status: ActivityStatus;
  createdBy?: string | null;
  createdAt: Timestamp | null;
}

/** Officer audit trail: powers the dashboard's activity table and the "Information Updated" timeline. */
export const logActivity = async (a: Omit<Activity, 'id' | 'createdAt'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'activities'), { ...a, location: a.location ?? null, createdAt: serverTimestamp() });
  } catch (e) {
    console.warn('logActivity failed', e);
  }
};

export const fetchRecentActivities = async (n = 20): Promise<Activity[]> => {
  const snap = await getDocs(query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
};
