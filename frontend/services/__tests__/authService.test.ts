import { registerUser, loginUser, logoutUser } from '../authService';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { saveUserProfile } from '../userService';

jest.mock('../userService', () => ({
  saveUserProfile: jest.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('creates a user and saves the profile data', async () => {
      const result = await registerUser('test@test.com', 'password123', 'John Doe', '0771234567');
      
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), // auth instance
        'test@test.com',
        'password123'
      );
      
      expect(saveUserProfile).toHaveBeenCalledWith('test-user-id', expect.objectContaining({
        fullName: 'John Doe',
        email: 'test@test.com',
        contactNumber: '0771234567',
        role: 'user',
        createdAt: 'mocked-timestamp'
      }));
      
      expect(result.user.uid).toBe('test-user-id');
    });
  });

  describe('loginUser', () => {
    it('calls signInWithEmailAndPassword', async () => {
      await loginUser('test@test.com', 'password123');
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@test.com',
        'password123'
      );
    });
  });

  describe('logoutUser', () => {
    it('calls signOut', async () => {
      await logoutUser();
      expect(signOut).toHaveBeenCalled();
    });
  });
});
