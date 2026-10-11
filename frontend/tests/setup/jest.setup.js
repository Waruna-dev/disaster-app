/* Global mocks shared by every test file. Individual tests override behaviour via the mocks' jest.fn()s. */

// ---- Firebase ---------------------------------------------------------------
jest.mock('firebase/firestore', () => require('../mocks/firestore'));
jest.mock('firebase/auth', () => require('../mocks/auth'));
jest.mock('firebase/app', () => ({ initializeApp: jest.fn((config) => ({ __app: true, options: config })) }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({ __storage: true })) }));
// The app's own firebase module is replaced so importing any service never boots the SDK.
// tests/unit/config/firebase.test.ts unmocks it to test the real wiring.
jest.mock('../../config/firebase', () => ({
  __esModule: true,
  auth: { currentUser: null },
  db: { __type: 'firestore' },
  storage: {},
  default: {},
}));

// ---- Navigation / platform --------------------------------------------------
jest.mock('expo-router', () => require('../mocks/expoRouter'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, ...rest }) => React.createElement(View, rest, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    SafeAreaInsetsContext: React.createContext(insets),
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 390, height: 844 } },
  };
});
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View, ScrollView, TouchableOpacity } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...rest }) => React.createElement(View, rest, children),
    ScrollView,
    TouchableOpacity,
    Swipeable: ({ children }) => React.createElement(View, null, children),
    State: {},
    Directions: {},
  };
});
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Swipeable = React.forwardRef(({ children, renderRightActions }, ref) => {
    React.useImperativeHandle(ref, () => ({ close: jest.fn(), openRight: jest.fn() }));
    return React.createElement(View, null, children, renderRightActions ? renderRightActions() : null);
  });
  return { __esModule: true, default: Swipeable };
});
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const { ScrollView } = require('react-native');
  return { KeyboardAwareScrollView: ScrollView };
});

// ---- Native rendering libraries --------------------------------------------
jest.mock('react-native-webview', () => require('../mocks/webview'));
jest.mock('react-native-svg', () => require('../mocks/passthrough').passthroughModule('Svg'));
jest.mock('react-native-maps', () => require('../mocks/passthrough').passthroughModule('MapView'));
jest.mock('expo-linear-gradient', () => require('../mocks/passthrough').passthroughModule('LinearGradient'));
jest.mock('expo-image', () => require('../mocks/passthrough').passthroughModule('Image'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const cache = {};
  return new Proxy(
    { __esModule: true },
    {
      get(target, family) {
        if (family in target) return target[family];
        if (!cache[family]) {
          cache[family] = ({ name, testID }) => React.createElement(Text, { testID: testID ?? `icon-${name}` }, '');
          cache[family].glyphMap = {};
        }
        return cache[family];
      },
    }
  );
});

// ---- Expo device APIs -------------------------------------------------------
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 6.9271, longitude: 79.8612 } })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  reverseGeocodeAsync: jest.fn(async () => [{ name: 'Main St', city: 'Colombo', district: 'Colombo', region: 'Western' }]),
  geocodeAsync: jest.fn(async () => [{ latitude: 6.9271, longitude: 79.8612 }]),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  MediaTypeOptions: { Images: 'Images', All: 'All' },
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri) => ({ uri, width: 100, height: 100 })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true), getStringAsync: jest.fn(async () => '') }));
jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
}));

// ---- i18n -------------------------------------------------------------------
// Real i18next with the English bundle, so rendered text matches what users see.
require('../../i18n');

// ---- Per-test hygiene -------------------------------------------------------
beforeEach(() => {
  require('../mocks/firestore').__reset();
  require('../mocks/auth').__reset();
  require('../mocks/expoRouter').__reset();
  require('../mocks/webview').__injected.length = 0;
  require('@react-native-async-storage/async-storage').clear();
});
