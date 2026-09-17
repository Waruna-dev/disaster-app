import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

interface ReportData {
  userId: string;
  disasterType: 'flood' | 'landslide';
  affectedArea: string;
  location?: { latitude: number; longitude: number };
  description: string;
  photoUrl?: string;
  status?: 'Pending' | 'Verified' | 'Rejected';
}

/**
 * Uploads a local image URI to Cloudinary via unsigned REST API.
 * Requires EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to be set.
 */
export const uploadReportPhoto = async (uri: string): Promise<string> => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const uploadResult = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      upload_preset: uploadPreset,
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error('Failed to upload photo to Cloudinary: ' + uploadResult.body);
  }

  const responseData = JSON.parse(uploadResult.body);
  return responseData.secure_url;
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
  if (cleanData.location === undefined) {
    cleanData.location = null;
  }

  await addDoc(collection(db, 'reports'), {
    ...cleanData,
    referenceNumber,
    status: 'Pending',
    createdAt: serverTimestamp()
  });

  return referenceNumber;
};
