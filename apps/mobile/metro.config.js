const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

/**
 * On the web, SQLite (expo-sqlite) needs cross-origin isolation headers that
 * static hosts like GitHub Pages can't send. Web builds use small stand-ins
 * instead; phone builds are unchanged.
 */
const WEB_REPLACEMENTS = {
  'expo-sqlite': path.resolve(__dirname, 'src/web/sqlite.ts'),
  'expo-sqlite/kv-store': path.resolve(__dirname, 'src/web/kvStore.ts'),
};

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_REPLACEMENTS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_REPLACEMENTS[moduleName] };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
