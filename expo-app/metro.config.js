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

/** Reduce jest-worker serialization load on large bundles (helps "Data cannot be cloned" / OOM on some setups). */
config.maxWorkers = Math.min(4, Math.max(1, require('os').cpus()?.length ?? 2));

module.exports = config;
