const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'db' to assetExts so Metro bundles tgsrtc.db as a static binary asset
config.resolver.assetExts.push('db');

module.exports = config;
