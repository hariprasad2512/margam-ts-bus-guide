import React, { useEffect, useState } from "react";

import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SQLiteDatabase } from 'expo-sqlite';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSearchStore } from '../store/useSearchStore';
import { getTripTimeline } from '../db/searchQueries';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RouteResults'>;

export default function RouteResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  
  const { fromStop, toStop, connectingRoutes, setSelectedTripTimeline, isSearching, } = useSearchStore();

  const handleSelectTrip = async (tripId: string) => {
    // setIsLoading(true); // Assuming you add setIsLoading to your store
    try {
      const timeline = await db?.getAllAsync(getTripTimeline, [tripId]);
      setSelectedTripTimeline(timeline as any);
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Error fetching trip timeline:', error);
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Buses</Text>
        <View style={{ width: 50 }} /> {/* Placeholder for centering */}
      </View>

      {/* Stop Context Banner */}
      <View style={styles.contextBanner}>
        <Text style={styles.contextLabel}>From:</Text>
        <Text style={styles.contextValue}>{fromStop?.stop_name}</Text>
        <View style={styles.contextDivider} />
        <Text style={styles.contextLabel}>To:</Text>
        <Text style={styles.contextValue}>{toStop?.stop_name}</Text>
      </View>

      {/* Results List */}
      <FlatList
        data={connectingRoutes}
        keyExtractor={(item) => item.trip_id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.routeCard} 
            onPress={() => handleSelectTrip(item.trip_id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🚌</Text>
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeNumber}>{item.route_short_name}</Text>
              <Text style={styles.routeSubtitle}>Tap to view timeline</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No direct buses found for this route.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 8 },
  backText: { fontSize: 16, color: '#0066FF', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  contextBanner: { backgroundColor: '#E7F0FF', padding: 16, margin: 16, borderRadius: 12 },
  contextLabel: { fontSize: 13, color: '#0066FF', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  contextValue: { fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
  contextDivider: { height: 1, backgroundColor: '#B3D4FF', marginVertical: 8 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  routeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  iconContainer: { backgroundColor: '#F0F4FF', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 22 },
  routeInfo: { flex: 1 },
  routeNumber: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  routeSubtitle: { fontSize: 14, color: '#666666', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: '#888888', fontWeight: '500' },
});