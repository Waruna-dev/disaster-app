// Fake config so modules that read EXPO_PUBLIC_* at call time behave as in a
// configured build. Never real credentials — every network/SDK call is mocked.
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '000000';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'test-preset';
