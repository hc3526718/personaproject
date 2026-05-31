import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DaltonVideoLoop } from './DaltonVideoLoop';

const LOGO_POSTER = require('../../assets/dalton_logo_final_img.png');

type Props = {
  /** Height of the hero slot (welcome / auth). */
  height?: number;
};

/** Auth welcome hero — loops brand video on black; shows logo poster until video is ready. */
export function AuthWelcomeRiveHero({ height = 220 }: Props) {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <View style={[styles.slot, { height }]}>
      {!videoReady ? (
        <Image source={LOGO_POSTER} style={styles.poster} resizeMode="contain" accessibilityLabel="" />
      ) : null}
      <DaltonVideoLoop style={styles.video} onReady={() => setVideoReady(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    overflow: 'hidden',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    maxWidth: 200,
    maxHeight: 200,
    alignSelf: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
