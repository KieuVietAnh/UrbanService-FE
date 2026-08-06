const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '..', '..');

config.resolver.platforms = ['ios', 'android', 'web'];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')];
config.resolver.extraNodeModules = {
  'react-native-web': path.resolve(workspaceRoot, 'node_modules', 'react-native-web'),
};
config.resolver.unstable_conditionsByPlatform = {
  ios: ['react-native'],
  android: ['react-native'],
  web: ['browser'],
};

module.exports = withNativeWind(config, { input: './global.css' });
