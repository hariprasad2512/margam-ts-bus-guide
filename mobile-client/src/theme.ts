export type ThemeScheme = 'light' | 'dark';
export type ThemeMode = 'system' | ThemeScheme;

export interface Palette {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryMuted: string;
  navy: string;
  ink: string;
  textMuted: string;
  canvas: string;
  surface: string;
  border: string;
  success: string;
  // Semantic tokens for one-off hexes previously inlined in screens.
  inputBg: string;
  buttonDisabled: string;
  onPrimary: string;
  error: string;
  badgeBoardBg: string;
  lineDimmed: string;
  dotBorderDim: string;
  overlay: string;
  shadow: string;
}

export const lightColors: Palette = {
  primary: '#004AAD',
  primaryDark: '#00357C',
  primarySoft: '#EAF2FF',
  primaryMuted: '#C9DEFF',
  navy: '#102A52',
  ink: '#172033',
  textMuted: '#5F6B7A',
  canvas: '#F5F8FC',
  surface: '#FFFFFF',
  border: '#DCE6F4',
  success: '#14804A',
  inputBg: '#F8FBFF',
  buttonDisabled: '#98BCEB',
  onPrimary: '#FFFFFF',
  error: '#B3261E',
  badgeBoardBg: '#E6F6EC',
  lineDimmed: '#C3CDD9',
  dotBorderDim: '#9AA5B1',
  overlay: 'rgba(16,42,82,0.35)',
  shadow: '#00357C',
};

export const darkColors: Palette = {
  primary: '#4C8DFF',
  primaryDark: '#2563EB',
  primarySoft: '#1A2740',
  primaryMuted: '#2C4370',
  navy: '#E8EEF9',
  ink: '#D9E2F1',
  textMuted: '#8B97AC',
  canvas: '#0B1220',
  surface: '#131C31',
  border: '#24314C',
  success: '#3DBE7B',
  inputBg: '#0F1829',
  buttonDisabled: '#2C4370',
  onPrimary: '#FFFFFF',
  error: '#FF8A80',
  badgeBoardBg: '#0D2B1E',
  lineDimmed: '#2A3B52',
  dotBorderDim: '#5A6B82',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};
