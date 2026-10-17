import React from 'react';
import { Image } from 'react-native';

type Props = {
  size?: number;
  tint?: string;
};

// Crosshair "use my location" glyph. Ships as pre-rendered PNGs
// (@1x/@2x/@3x) instead of react-native-svg so it works in OTA updates
// on existing builds that predate the native SVG module. The PNG is a
// single solid color, so `tint` recolors it for the active theme.
export default function LocationCrosshairIcon({ size = 18, tint }: Props) {
  return (
    <Image
      source={require('../../assets/location-crosshair.png')}
      style={{ width: size, height: size, tintColor: tint }}
      resizeMode="contain"
    />
  );
}
