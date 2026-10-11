/** Stand-in for `firebase/auth`. `__setUser` drives every onAuthStateChanged listener. */
const authListeners = [];

const defaults = {
  initializeAuth: () => ({ currentUser: null }),
  getAuth: () => ({ currentUser: null }),
  getReactNativePersistence: (storage) => ({ __persistence: storage }),
  createUserWithEmailAndPassword: async (_auth, email) => ({ user: { uid: 'new-uid', email } }),
  signInWithEmailAndPassword: async (_auth, email) => ({ user: { uid: 'uid-1', email } }),
  signOut: async () => undefined,
  sendPasswordResetEmail: async () => undefined,
  updatePassword: async () => undefined,
  deleteUser: async () => undefined,
  reauthenticateWithCredential: async () => undefined,
  updateProfile: async () => undefined,
  onAuthStateChanged: (_auth, cb) => {
    authListeners.push(cb);
    return jest.fn(() => {
      const i = authListeners.indexOf(cb);
      if (i >= 0) authListeners.splice(i, 1);
    });
  },
};

const fns = {};
for (const [name, impl] of Object.entries(defaults)) fns[name] = jest.fn(impl);

module.exports = {
  ...fns,
  EmailAuthProvider: { credential: jest.fn((email, password) => ({ email, password })) },
  __authListeners: authListeners,
  __setUser(user) {
    [...authListeners].forEach((cb) => cb(user));
  },
  __reset() {
    authListeners.length = 0;
    for (const [name, impl] of Object.entries(defaults)) {
      fns[name].mockReset();
      fns[name].mockImplementation(impl);
    }
    module.exports.EmailAuthProvider.credential.mockClear();
  },
};
