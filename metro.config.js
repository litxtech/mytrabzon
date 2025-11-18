// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Hot reload ve fast refresh için optimizasyonlar
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

// Fast refresh'i garanti et
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Watch folders - değişiklikleri anlık algıla
config.watchFolders = [__dirname];

// Development'ta cache'i optimize et - hot reload için
if (process.env.NODE_ENV === 'development') {
  // Fast refresh için cache'i hafif tut
  config.resetCache = false; // Cache'i koru ama hızlı güncelle
}

module.exports = config;

