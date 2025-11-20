// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Web platformunu devre dışı bırak - sadece mobil (iOS/Android)
config.resolver.platforms = ['ios', 'android', 'native'];

module.exports = config;

