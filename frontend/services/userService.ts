import { db } from '../config/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { anonymizeUserReports } from './reportService';

/**
 * Saves extra user information (name, role, etc.) to Firestore.
 */
export const saveUserProfile = async (userId: string, data: any) => {
  try {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

/**
 * Fetches the user profile from Firestore.
 */
export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Deletes the user profile from Firestore.
 */
export const deleteUserData = async (userId: string) => {
  try {
    // First, anonymize their reports instead of deleting them
    await anonymizeUserReports(userId);
    
    // Then delete the user's profile document
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};
