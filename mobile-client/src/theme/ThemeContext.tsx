import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { darkColors, lightColors, Palette, ThemeMode, ThemeScheme } from '../theme';

// Persists the appearance choice to a tiny JSON file in the app's document
// directory (expo-file-system is already bundled — no new native deps, so
// this ships fine over OTA).
const PREFS_PATH = `${FileSystem.documentDirectory}preferences.json`;

interface Preferences {
  themeMode: ThemeMode;
}

interface ThemeContextValue {
  colors: Palette;
  scheme: ThemeScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readPreferences(): Promise<Preferences> {
  try {
    const info = await FileSystem.getInfoAsync(PREFS_PATH);
    if (!info.exists) return { themeMode: 'system' };
    const raw = await FileSystem.readAsStringAsync(PREFS_PATH);
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const mode = parsed.themeMode;
    if (mode === 'system' || mode === 'light' || mode === 'dark') {
      return { themeMode: mode };
    }
    return { themeMode: 'system' };
  } catch {
    return { themeMode: 'system' };
  }
}

async function writePreferences(prefs: Preferences): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(PREFS_PATH, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;
    readPreferences().then((prefs) => {
      if (isMounted) setModeState(prefs.themeMode);
    });
    return () => { isMounted = false; };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    writePreferences({ themeMode: next });
  };

  const scheme: ThemeScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: scheme === 'dark' ? darkColors : lightColors, scheme, mode, setMode }),
    // setMode is stable enough (setState + fire-and-forget write).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
