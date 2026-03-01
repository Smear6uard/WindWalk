const React = require('react');

// Very minimal mock of react-native primitives for Jest tests
const View = (props) => React.createElement('View', props, props.children);
const Text = (props) => React.createElement('Text', props, props.children);
const TextInput = (props) => React.createElement('TextInput', props, props.children);
const TouchableOpacity = (props) =>
  React.createElement('TouchableOpacity', props, props.children);
const StyleSheet = {
  create: (styles) => styles,
};

module.exports = {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
};

