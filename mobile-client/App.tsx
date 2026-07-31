import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false); // check if DB is active or not
  const [error, setError] = useState<string | null>(null); // error State

  useEffect(() => {
    async function setup() {
      try {
        // 1. Ensure the 52MB file is safely copied to the phone's native storage
        await initDatabase();
        // 2. Tell the UI the database is ready
        setIsDbReady(true);
      } catch (e) {
        console.error(e);
        setError("Failed to load database.");
      }
    }
    
    setup();
  }, []);

  // Fallback for Error
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16 }}>{error}</Text>
      </View>
    );
  }

  // Fallback if DB not ready
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={{ marginTop: 15, fontSize: 16, color: '#666' }}>Loading Transit Data...</Text>
      </View>
    );
  }

  return <AppNavigator />;
}