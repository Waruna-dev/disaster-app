import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

interface ReportData {
  userId: string;
  disasterType: 'flood' | 'landslide';
  affectedArea: string;
  description: string;
  contactNumber?: string;
  affectedItems?: string[];
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  photoUrls?: string[];
  status?: 'Pending' | 'Verified' | 'Rejected';
}

import { uploadImage } from './imageUploadService';

/**
 * Uploads a local image URI to Cloudinary via unsigned REST API.
 * Requires EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to be set.
 */
export const uploadReportPhoto = async (uri: string): Promise<string> => {
  const result = await uploadImage(uri, 'report');
  return result.url;
};

/**
 * Saves a new report to the Firestore database.
 */
export const createReport = async (reportData: ReportData): Promise<string> => {
  // Generate a random Reference ID like REP-58392
  const referenceNumber = `REP-${Math.floor(10000 + Math.random() * 90000)}`;

  // Firestore does not support undefined values.
  // Clean the data by removing undefined fields or explicitly setting them to null.
  const cleanData: any = { ...reportData };
  if (cleanData.photoUrl === undefined) {
    cleanData.photoUrl = null;
  }

  await addDoc(collection(db, 'reports'), {
    ...cleanData,
    referenceNumber,
    status: 'Pending',
    createdAt: serverTimestamp()
  });

  return referenceNumber;
};

/**
 * Fetches all reports submitted by a specific user.
 */
export const fetchUserReports = async (userId: string) => {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', userId)
  );

  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort client-side to avoid requiring a composite index in Firestore
  return docs.sort((a, b) => {
    const dateA = (a as any).createdAt?.toDate ? (a as any).createdAt.toDate().getTime() : 0;
    const dateB = (b as any).createdAt?.toDate ? (b as any).createdAt.toDate().getTime() : 0;
    return dateB - dateA;
  });
};


/**
 * Fetches a single report by its Document ID.
 */
export const fetchReportById = async (id: string) => {
  const reportDoc = await getDoc(doc(db, 'reports', id));
  if (reportDoc.exists()) {
    return { id: reportDoc.id, ...reportDoc.data() };
  }
  return null;
};

/**
 * Deletes a report by its Document ID.
 */
export const deleteReport = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'reports', id));
  } catch (error) {
    console.error("Error deleting report: ", error);
    throw error;
  }
};

/**
 * Anonymizes a user's reports when they delete their account.
 */
export const anonymizeUserReports = async (userId: string) => {
  try {
    const q = query(collection(db, 'reports'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const updatePromises = querySnapshot.docs.map(docSnapshot => 
      updateDoc(doc(db, 'reports', docSnapshot.id), {
        userId: 'anonymous',
        authorName: 'Anonymous User'
      })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error anonymizing reports: ', error);
    throw error;
  }
};
