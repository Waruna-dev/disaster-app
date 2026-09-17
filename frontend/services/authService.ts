import { auth } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updatePassword,
  deleteUser
} from 'firebase/auth';
import { saveUserProfile } from './userService';

export const registerUser = async (email: string, password: string, fullName: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Save extra profile data
  await saveUserProfile(userCredential.user.uid, {
    fullName,
    email,
    role: 'admin', // TEMP: defaulted to 'admin' for testing the admin screens — flip back to 'user' before shipping. Available roles: 'user', 'admin'
    createdAt: new Date().toISOString()
  });
  return userCredential;
};

export const loginUser = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  return await signOut(auth);
};

export const resetPassword = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};

export const updateUserPassword = async (newPassword: string) => {
  if (!auth.currentUser) throw new Error("No authenticated user");
  return await updatePassword(auth.currentUser, newPassword);
};

export const deleteUserAccount = async () => {
  if (!auth.currentUser) throw new Error("No authenticated user");
  return await deleteUser(auth.currentUser);
};
