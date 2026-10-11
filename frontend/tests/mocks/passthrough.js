/**
 * Factory for modules that are just React components rendering native views
 * (react-native-svg, react-native-maps, icon sets…). Every named export becomes a
 * View that passes children through, so trees render without native code.
 */
const React = require('react');

// SVG elements whose children are raw strings must map to RN <Text>, not <View>.
const TEXT_LIKE = new Set(['Text', 'TSpan', 'TextPath']);

function makeComponent(name) {
  const { View, Text } = require('react-native');
  const Host = TEXT_LIKE.has(name) ? Text : View;
  const C = React.forwardRef(function Passthrough({ children, ...rest }, ref) {
    return React.createElement(Host, { ...rest, ref, accessibilityHint: rest.accessibilityHint ?? name }, children);
  });
  C.displayName = name;
  return C;
}

function passthroughModule(defaultName) {
  const cache = {};
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        const name = prop === 'default' ? defaultName : prop;
        if (!cache[name]) cache[name] = makeComponent(name);
        return cache[name];
      },
    }
  );
}

module.exports = { passthroughModule, makeComponent };
