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
import { colors } from '../theme';

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
        // GTFS times can exceed 24h (e.g. 25:30 = 01:30 next day). Keep raw
        // minutes for ordering; callers normalize for display/comparison.
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
          // Normalize >24h times into today's clock for the upcoming check,
          // so e.g. 25:30 counts as 01:30. Show all buses sorted; past ones
          // render dimmed instead of vanishing after the last bus of the day.
          const clockMinutes =
            arrivalMinutes !== null ? ((arrivalMinutes % 1440) + 1440) % 1440 : null;
          const isFuture = clockMinutes !== null && clockMinutes >= nowMinutes;

          return {
            ...route,
            originStopName: firstStop?.stop_name ?? 'Unknown',
            arrivalTimeAtFromStop: matchingStop?.arrival_time ?? null,
            arrivalMinutesFromMidnight: arrivalMinutes,
            isFuture,
          };
        })
      );

      const upcomingCards = cards
        .slice()
        .sort((a, b) => (a.arrivalMinutesFromMidnight ?? 0) - (b.arrivalMinutesFromMidnight ?? 0));

      if (isMounted) {
        setRouteCards(upcomingCards);
        setIsLoading(false);
      }
    };

    loadRouteCards();

    return () => {
      isMounted = false;
    };
  }, [db, connectingRoutes, fromStop?.stop_id, fromStop?.stop_name, toStop?.stop_id, toStop?.stop_name]);

  const handleSelectTrip = async (tripId: string) => {
    try {
      const timeline = await db?.getAllAsync<TimelineStop>(getTripTimeline, [tripId]);

      if (!timeline || !timeline.length || !fromStop?.stop_id || !toStop?.stop_id) {
        setSelectedTripTimeline([]);
        navigation.navigate('TripTimeline');
        return;
      }

      const findStopIndex = (stopId: string, stopName: string) =>
        timeline.findIndex(
          (stop) => stop.stop_id === stopId || stop.stop_name === stopName
        );

      const fromIndex = findStopIndex(fromStop.stop_id, fromStop.stop_name);
      const toIndex = findStopIndex(toStop.stop_id, toStop.stop_name);

      if (fromIndex < 0 || toIndex < 0) {
        console.warn('Selected route does not contain both chosen stops. Showing full route timeline.');
        setSelectedTripTimeline(timeline);
        navigation.navigate('TripTimeline');
        return;
      }

      const orderedTimeline =
        fromIndex <= toIndex
          ? timeline.slice(fromIndex, toIndex + 1)
          : timeline;

      setSelectedTripTimeline(orderedTimeline);
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Error fetching trip timeline:', error);
    }
  };

  const formatTime = (value: string | null) => {
    if (!value) return '—';

    const [hours, minutes] = value.split(':').map(Number);
    const rawHours = Number.isFinite(hours) ? hours : 0;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    const safeHours = ((rawHours % 24) + 24) % 24;
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching buses for you...</Text>
        </View>
      ) : (
        <FlatList
          data={routeCards}
          keyExtractor={(item) => `${item.trip_id}-${item.route_short_name}`}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.routeCard, !item.isFuture && styles.routeCardPast]} 
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
          ListEmptyComponent={<Text style={styles.emptyText}>No direct buses found{fromStop?.stop_name && toStop?.stop_name ? ` from ${fromStop.stop_name} to ${toStop.stop_name}` : ''}.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  contextBanner: { backgroundColor: colors.primarySoft, padding: 16, margin: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryMuted },
  contextLabel: { fontSize: 11, color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 },
  contextValue: { fontSize: 16, color: colors.navy, fontWeight: '700' },
  contextDivider: { height: 1, backgroundColor: colors.primaryMuted, marginVertical: 8 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeCardPast: { opacity: 0.55 },
  timeBadge: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timeValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  routeInfo: { flex: 1 },
  routeNumber: { fontSize: 18, fontWeight: '800', color: colors.navy },
  routeSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  routeTime: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
});
