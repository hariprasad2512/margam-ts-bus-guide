import React from 'react';
import { Image } from 'react-native';

type Props = {
  size?: number;
};

// Crosshair "use my location" glyph. Ships as pre-rendered PNGs
// (@1x/@2x/@3x) instead of react-native-svg so it works in OTA updates
// on existing builds that predate the native SVG module.
export default function LocationCrosshairIcon({ size = 18 }: Props) {
  return (
    <Image
      source={require('../../assets/location-crosshair.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
