const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
const assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
if (!assetExts.includes('riv')) {
  assetExts.push('riv');
}
config.resolver = {
  ...config.resolver,
  assetExts,
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
