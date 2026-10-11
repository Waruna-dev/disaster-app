/**
 * `react-native-webview` stand-in: renders a View tagged testID="webview" that
 * carries every prop (html source, onMessage, onLoadEnd…) so tests can fire
 * WebView events, and exposes injectJavaScript on its ref, recording each call.
 */
const React = require('react');
const { View } = require('react-native');

const injected = [];

const WebView = React.forwardRef(function WebView({ source, ...props }, ref) {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: (js) => injected.push(js),
    reload: jest.fn(),
    postMessage: jest.fn(),
  }));
  return React.createElement(View, { testID: 'webview', ...props, html: source && source.html });
});

/** Simulates the page posting a message to React Native. */
function messageEvent(payload) {
  return { nativeEvent: { data: typeof payload === 'string' ? payload : JSON.stringify(payload) } };
}

module.exports = { WebView, default: WebView, __injected: injected, __messageEvent: messageEvent };
