import React, { useEffect, useState } from "react";

import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SQLiteDatabase } from 'expo-sqlite';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSearchStore } from '../store/useSearchStore';
import { getTripTimeline, RouteResult, TimelineStop } from '../db/searchQueries';
import { initDatabase } from '../db/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RouteResults'>;

interface RouteCardItem extends RouteResult {
  originStopName: string;
  arrivalTimeAtFromStop: string | null;
  arrivalMinutesFromMidnight: number | null;
  isFuture: boolean;
}

export default function RouteResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [routeCards, setRouteCards] = useState<RouteCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { fromStop, toStop, connectingRoutes, setSelectedTripTimeline } = useSearchStore();

  useEffect(() => {
    let isMounted = true;
    initDatabase()
      .then((database) => {
        if (isMounted) setDb(database);
      })
      .catch((error) => console.error('Failed to init DB:', error));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRouteCards = async () => {
      if (!db || !fromStop || !connectingRoutes.length) {
        if (isMounted) {
          setRouteCards([]);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) setIsLoading(true);

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTimeToMinutes = (value: string | null) => {
        if (!value) return null;
        const [hours, minutes] = value.split(':').map(Number);
        const safeHours = Number.isFinite(hours) ? hours : 0;
        const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
        return safeHours * 60 + safeMinutes;
      };

      const cards = await Promise.all(
        connectingRoutes.map(async (route) => {
          const timeline = await db.getAllAsync<TimelineStop>(getTripTimeline, [route.trip_id]);
          const firstStop = timeline[0];
          const matchingStop = timeline.find(
            (stop) => stop.stop_id === fromStop.stop_id || stop.stop_name === fromStop.stop_name
          );

          const arrivalMinutes = parseTimeToMinutes(matchingStop?.arrival_time ?? null);
          const isFuture = arrivalMinutes !== null && arrivalMinutes >= nowMinutes;

          return {
            ...route,
            originStopName: firstStop?.stop_name ?? 'Unknown',
            arrivalTimeAtFromStop: matchingStop?.arrival_time ?? null,
            arrivalMinutesFromMidnight: arrivalMinutes,
            isFuture,
          };
        })
      );

      const upcomingCards = cards.filter((card) => card.isFuture);

      if (isMounted) {
        setRouteCards(upcomingCards);
        setIsLoading(false);
      }
    };

    loadRouteCards();

    return () => {
      isMounted = false;
    };
  }, [db, connectingRoutes, fromStop?.stop_id, fromStop?.stop_name]);

  const handleSelectTrip = async (tripId: string) => {
    try {
      const timeline = await db?.getAllAsync<TimelineStop>(getTripTimeline, [tripId]);

      if (!timeline || !timeline.length || !fromStop?.stop_id || !toStop?.stop_id) {
        setSelectedTripTimeline([]);
        navigation.navigate('TripTimeline');
        return;
      }

      const fromIndex = timeline.findIndex((stop) => stop.stop_id === fromStop.stop_id);
      const toIndex = timeline.findIndex((stop) => stop.stop_id === toStop.stop_id);

      const startIndex = fromIndex >= 0 ? fromIndex : 0;
      const endIndex = toIndex >= 0 ? toIndex : timeline.length - 1;

      const orderedTimeline =
        startIndex <= endIndex
          ? timeline.slice(startIndex, endIndex + 1)
          : timeline.slice(endIndex, startIndex + 1).reverse();

      setSelectedTripTimeline(orderedTimeline);
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Error fetching trip timeline:', error);
    }
  };

  const formatTime = (value: string | null) => {
    if (!value) return '—';

    const [hours, minutes] = value.split(':').map(Number);
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    const period = safeHours >= 12 ? 'PM' : 'AM';
    const displayHour = safeHours % 12 === 0 ? 12 : safeHours % 12;
    return `${displayHour}:${safeMinutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Buses</Text>
        <View style={{ width: 50 }} />
      </View>
      <View style={styles.contextBanner}>
        <Text style={styles.contextLabel}>From:</Text>
        <Text style={styles.contextValue}>{fromStop?.stop_name}</Text>
        <View style={styles.contextDivider} />
        <Text style={styles.contextLabel}>To:</Text>
        <Text style={styles.contextValue}>{toStop?.stop_name}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Fetching buses for you...</Text>
        </View>
      ) : (
        <FlatList
          data={routeCards}
          keyExtractor={(item) => `${item.trip_id}-${item.route_short_name}`}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.routeCard} 
            onPress={() => handleSelectTrip(item.trip_id)}
            activeOpacity={0.7}
          >
            <View style={styles.timeBadge}>
              <Text style={styles.timeValue}>{formatTime(item.arrivalTimeAtFromStop)}</Text>
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeNumber}>Bus {item.route_short_name}</Text>
              <Text style={styles.routeSubtitle}>From {item.originStopName}</Text>
              <Text style={styles.routeTime}>
                {fromStop?.stop_name ? `Arrives at ${fromStop.stop_name}` : 'Tap to view timeline'}
              </Text>
            </View>
          </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No direct buses found for this route.</Text>}
        />
      )}
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
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4FF',
  },
  timeBadge: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#E7F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timeValue: { fontSize: 16, fontWeight: '700', color: '#0066FF' },
  routeInfo: { flex: 1 },
  routeNumber: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  routeSubtitle: { fontSize: 14, color: '#666666', marginTop: 2 },
  routeTime: { fontSize: 13, color: '#4B5563', marginTop: 4, fontWeight: '500' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4B5563', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: '#888888', fontWeight: '500' },
});