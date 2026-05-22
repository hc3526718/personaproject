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

/** CI (Vercel): lower parallelism to reduce peak memory during web export. */
const cpus = require('os').cpus()?.length ?? 2;
config.maxWorkers = process.env.CI
  ? 1
  : Math.min(4, Math.max(1, cpus));

module.exports = config;
