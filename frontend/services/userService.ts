import { db } from '../config/firebase';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, FieldValue } from 'firebase/firestore';
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

/**
 * Removes the home area from the user's profile.
 */
export const removeHomeArea = async (userId: string, deleteField: () => FieldValue) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      homeArea: deleteField(),
      homeAreaUpdatedAt: deleteField(),
    });
  } catch (error) {
    console.error('Error removing home area:', error);
    throw error;
  }
};

