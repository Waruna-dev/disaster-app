/** Stand-in for `expo-router`: a shared spy router plus pass-through navigators. */
const React = require('react');

const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let params = {};

function Navigator({ children }) {
  return React.createElement(React.Fragment, null, children);
}
Navigator.Screen = function Screen() {
  return null;
};

module.exports = {
  router,
  useRouter: () => router,
  useLocalSearchParams: jest.fn(() => params),
  useGlobalSearchParams: jest.fn(() => params),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  useFocusEffect: (effect) => {
    React.useEffect(() => effect(), [effect]);
  },
  Stack: Navigator,
  Tabs: Navigator,
  Slot: Navigator,
  Redirect: function Redirect() {
    return null;
  },
  Link: function Link({ children }) {
    return React.createElement(React.Fragment, null, children);
  },
  __setParams(next) {
    params = next;
  },
  __reset() {
    params = {};
    Object.values(router).forEach((fn) => fn.mockClear());
    module.exports.useLocalSearchParams.mockImplementation(() => params);
  },
};
