import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function AppShell() {
  const { colors, scheme } = useTheme();
  const [isDbReady, setIsDbReady] = useState(false); // check if DB is active or not
  const [error, setError] = useState<string | null>(null); // error State
  const [loadingMessage, setLoadingMessage] = useState('Preparing transit data…');

  useEffect(() => {
    async function setup() {
      try {
        // 1. Ensure the 52MB file is safely copied to the phone's native storage
        await initDatabase(setLoadingMessage);
        // 2. Tell the UI the database is ready
        setIsDbReady(true);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load the transit database.');
      }
    }

    setup();
  }, []);

  // Fallback for Error
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.canvas }]}>
        <Text style={[styles.errorTitle, { color: colors.navy }]}>Transit data couldn’t load</Text>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
      </View>
    );
  }

  // Fallback if DB not ready
  if (!isDbReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <Image source={require('./assets/splash.png')} style={styles.loadingBrand} resizeMode="contain" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{loadingMessage}</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  loadingBrand: { width: 210, height: 455, marginBottom: 18 },
  loadingText: { marginTop: 15, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  errorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  errorText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
