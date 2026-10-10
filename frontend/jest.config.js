module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|firebase|@firebase)'
  ],
  moduleNameMapper: {
    '^react-native/setup-env$': '<rootDir>/node_modules/react-native/jest/setup.js',
    '^test-renderer$': 'react-test-renderer'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/__tests__/**'
  ]
};
