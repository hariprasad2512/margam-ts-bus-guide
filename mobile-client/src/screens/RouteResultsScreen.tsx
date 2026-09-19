import React, { useEffect, useState } from "react";

import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSearchStore } from '../store/useSearchStore';
import { getTripTimeline, TimelineStop } from '../db/searchQueries';
import { initDatabase } from '../db/database';
import { colors } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RouteResults'>;

export default function RouteResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showAll, setShowAll] = useState(false);
  
  // Cards arrive pre-enriched from the home screen (under its spinner),
  // so this screen renders instantly with no loader or blank state.
  const { fromStop, toStop, connectingRoutes, routeCards, setSelectedTripTimeline, setSelectedFullTimeline, setSelectedTripMeta } = useSearchStore();

  useEffect(() => {
    setShowAll(false);
  }, [connectingRoutes, routeCards, fromStop?.stop_id, toStop?.stop_id]);

  const upcomingOnlyCards = routeCards.filter((card) => card.isFuture);
  const visibleCards = showAll ? routeCards : upcomingOnlyCards;

  const handleSelectTrip = async (tripId: string, routeShortName: string) => {
    try {
      const db = await initDatabase();
      const timeline = await db.getAllAsync<TimelineStop>(getTripTimeline, [tripId]);

      if (!timeline || !timeline.length || !fromStop?.stop_id || !toStop?.stop_id) {
        setSelectedTripTimeline([]);
        setSelectedFullTimeline([]);
        setSelectedTripMeta(null);
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
        setSelectedFullTimeline(timeline);
        setSelectedTripMeta({ tripId, routeShortName, fromIndex: null, toIndex: null });
        navigation.navigate('TripTimeline');
        return;
      }

      const orderedTimeline =
        fromIndex <= toIndex
          ? timeline.slice(fromIndex, toIndex + 1)
          : timeline;

      setSelectedTripTimeline(orderedTimeline);
      setSelectedFullTimeline(timeline);
      // Reversed direction falls back to the full timeline with no
      // segment, so the Timeline hides the entire-route toggle.
      setSelectedTripMeta(
        fromIndex <= toIndex
          ? { tripId, routeShortName, fromIndex, toIndex }
          : { tripId, routeShortName, fromIndex: null, toIndex: null }
      );
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Error fetching trip timeline:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Buses</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.contextBanner}>
        <Text style={styles.contextLabel}>From:</Text>
        <Text style={styles.contextValue}>{fromStop?.stop_name}</Text>
        <View style={styles.contextDivider} />
        <Text style={styles.contextLabel}>To:</Text>
        <Text style={styles.contextValue}>{toStop?.stop_name}</Text>
      </View>

      {routeCards.length > 0 && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowAll((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleButtonText}>
              {showAll ? `Show upcoming only (${upcomingOnlyCards.length})` : `Check all buses (${routeCards.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={visibleCards}
        keyExtractor={(item) => `${item.trip_id}-${item.route_short_name}`}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.routeCard} 
          onPress={() => handleSelectTrip(item.trip_id, item.route_short_name)}
          activeOpacity={0.7}
        >
          <View style={styles.routeInfo}>
            <Text style={styles.routeNumber}>Bus {item.route_short_name}</Text>
            <Text style={styles.routeSubtitle}>
              {fromStop?.stop_name} → {toStop?.stop_name}
            </Text>
            <Text style={styles.routeHint}>Tap to view stops</Text>
          </View>
          <Text style={styles.cardChevron}>›</Text>
        </TouchableOpacity>
        )}
        ListEmptyComponent={
          routeCards.length > 0 && !showAll ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No more buses today{fromStop?.stop_name && toStop?.stop_name ? ` from ${fromStop.stop_name} to ${toStop.stop_name}` : ''}.</Text>
              <TouchableOpacity style={styles.toggleButton} onPress={() => setShowAll(true)} activeOpacity={0.7}>
                <Text style={styles.toggleButtonText}>Check all buses ({routeCards.length})</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>No direct buses found{fromStop?.stop_name && toStop?.stop_name ? ` from ${fromStop.stop_name} to ${toStop.stop_name}` : ''}.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  backChevron: { fontSize: 24, color: colors.primary, fontWeight: '800', marginTop: -2 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.navy },
  headerSpacer: { width: 40 },
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
  routeInfo: { flex: 1 },
  routeNumber: { fontSize: 18, fontWeight: '800', color: colors.navy },
  routeSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  routeHint: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  cardChevron: { fontSize: 24, color: colors.primary, fontWeight: '800', marginLeft: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 10 },
  toggleButton: {
    backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.primaryMuted, alignSelf: 'center',
  },
  toggleButtonText: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', gap: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
});
