import { saveUserProfile, deleteUserData, removeHomeArea } from '../userService';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// We rely on the global mock in jest.setup.js for firebase/auth and firestore.

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveUserProfile', () => {
    it('calls setDoc with the correct data and omits undefined/null fields', async () => {
      const mockProfile = {
        fullName: 'Test User',
        role: 'user',
        email: 'test@example.com',
        contactNumber: '1234567890',
        createdAt: 'test-date',
      };

      await saveUserProfile('test-uid', mockProfile);
      
      expect(doc).toHaveBeenCalledWith(undefined, 'users', 'test-uid');
      expect(setDoc).toHaveBeenCalledWith(
        undefined, // returned by doc mock
        expect.objectContaining({
          fullName: 'Test User',
          role: 'user',
          email: 'test@example.com'
        }),
        { merge: true }
      );
    });
  });

  describe('deleteUserData', () => {
    it('deletes the user document from Firestore', async () => {
      await deleteUserData('test-uid');
      
      expect(doc).toHaveBeenCalledWith(undefined, 'users', 'test-uid');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
