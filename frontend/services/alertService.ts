import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { DisasterType } from '../types/report';
import { RiskLevel } from '../types/alert';

interface CreateWarningData {
  title: string;
  hazardType: DisasterType;
  riskLevel: RiskLevel;
  affectedArea: string;
  latitude: number;
  longitude: number;
  radius: number;
  message: string;
  expiresAt: Date;
  createdBy: string;
  createdByName?: string | null;
  sourceReportId?: string | null;
}

/**
 * Saves a new public warning to Firestore. Mirrors createReport's shape in
 * services/reportService.ts: Firestore rejects `undefined`, so optional fields
 * are normalized to `null` before the write.
 */
export const createWarning = async (data: CreateWarningData): Promise<string> => {
  const docRef = await addDoc(collection(db, 'warnings'), {
    title: data.title,
    hazardType: data.hazardType,
    riskLevel: data.riskLevel,
    affectedArea: data.affectedArea,
    latitude: data.latitude,
    longitude: data.longitude,
    radius: data.radius,
    message: data.message,
    status: 'Active',
    createdBy: data.createdBy,
    createdByName: data.createdByName ?? null,
    sourceReportId: data.sourceReportId ?? null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(data.expiresAt),
  });

  return docRef.id;
};

/** Marks a warning as cancelled without deleting it (keeps it for audit history). */
export const cancelWarning = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'warnings', id), { status: 'Cancelled' });
};

export const deleteWarning = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'warnings', id));
};
