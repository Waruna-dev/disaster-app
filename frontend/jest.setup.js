import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(() => ({ currentUser: { uid: 'test-user-id' } })),
    initializeAuth: jest.fn(() => ({ currentUser: { uid: 'test-user-id' } })),
    getReactNativePersistence: jest.fn(),
    browserLocalPersistence: {},
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-user-id' } })),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    updatePassword: jest.fn(),
    deleteUser: jest.fn(),
  };
});

jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(),
    doc: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn(),
    deleteDoc: jest.fn(),
    updateDoc: jest.fn(),
    collection: jest.fn(),
    addDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
    serverTimestamp: jest.fn(() => 'mocked-timestamp'),
    Timestamp: {
      fromDate: jest.fn((date) => ({ toDate: () => date })),
      now: jest.fn(() => ({ toDate: () => new Date() })),
    },
  };
});

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));
