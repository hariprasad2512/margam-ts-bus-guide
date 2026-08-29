import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';

export default function App() {
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
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Transit data couldn’t load</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Fallback if DB not ready
  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={require('./assets/splash.png')} style={styles.loadingBrand} resizeMode="contain" />
        <ActivityIndicator size="large" color="#004AAD" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 28 },
  loadingBrand: { width: 210, height: 455, marginBottom: 18 },
  loadingText: { marginTop: 15, fontSize: 15, color: '#4F617A', fontWeight: '600', textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F8FC', padding: 28 },
  errorTitle: { color: '#102A52', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  errorText: { color: '#5F6B7A', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
