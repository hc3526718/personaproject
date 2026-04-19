const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  getDefaultConfig: (projectRoot) => {
    const base = getDefaultConfig(projectRoot);
    base.transformer = {
      ...base.transformer,
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
    };
    const assetExts = base.resolver.assetExts.filter((ext) => ext !== 'svg');
    if (!assetExts.includes('riv')) {
      assetExts.push('riv');
    }
    base.resolver = {
      ...base.resolver,
      assetExts,
      sourceExts: [...base.resolver.sourceExts, 'svg'],
    };
    return base;
  },
});

module.exports = config;
