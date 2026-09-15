import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

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
