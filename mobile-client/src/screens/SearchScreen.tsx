import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
} from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useSearchStore } from '../store/useSearchStore';
import { 
  Route, 
  RouteResult,
  TimelineStop,
  getRoutesBetweenStops, 
  getTripTimeline,
  getRepresentativeRouteTrip,
  searchStopsQuery,
  StopResult 
} from '../db/searchQueries';
import { initDatabase } from '../db/database';
import { colors } from '../theme';

// Type our navigation prop
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  // Local state for the Auto-Suggest Dropdowns
  const [fromSearchText, setFromSearchText] = useState('');
  const [toSearchText, setToSearchText] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<StopResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<StopResult[]>([]);
  const [routeError, setRouteError] = useState('');
  // Debounce + stale-response guards for the auto-suggest dropdowns.
  const fromTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fromRequestId = useRef(0);
  const toRequestId = useRef(0);

  useEffect(() => () => {
    if (fromTimer.current) clearTimeout(fromTimer.current);
    if (toTimer.current) clearTimeout(toTimer.current);
  }, []);

  // Destructure exact Zustand state (timeline lives on other screens)
  const {
    fromStop,
    toStop,
    setFromStop,
    setToStop,
    setConnectingRoutes,
    setSelectedTripTimeline,
    searchTerm,
    results,
    isSearching,
    setSearchTerm,
    executeSearch,
  } = useSearchStore();

  useEffect(() => {
    let isMounted = true;
    initDatabase()
      .then((database) => {
        if (isMounted) setDb(database);
      })
      .catch((error) => console.error('Failed to init DB:', error));
    return () => { isMounted = false; };
  }, []);

  // --- Auto-Suggest Logic for "From" Stop ---
  const handleFromChange = (text: string) => {
    setFromSearchText(text);
    if (fromStop) setFromStop(null);
    if (routeError) setRouteError('');

    if (fromTimer.current) clearTimeout(fromTimer.current);
    if (text.trim().length < 2 || !db) {
      setFromSuggestions([]);
      return;
    }
    const queryText = text;
    fromTimer.current = setTimeout(async () => {
      const requestId = ++fromRequestId.current;
      try {
        const res = await db.getAllAsync<StopResult>(searchStopsQuery, [`%${queryText}%`, queryText]);
        if (requestId === fromRequestId.current) setFromSuggestions(res);
      } catch (e) {
        console.error(e);
      }
    }, 200);
  };

  const handleSelectFrom = (stop: StopResult) => {
    setFromStop(stop);
    setFromSearchText(stop.stop_name);
    setFromSuggestions([]);
  };

  // --- Auto-Suggest Logic for "To" Stop ---
  const handleToChange = (text: string) => {
    setToSearchText(text);
    if (toStop) setToStop(null);
    if (routeError) setRouteError('');

    if (toTimer.current) clearTimeout(toTimer.current);
    if (text.trim().length < 2 || !db) {
      setToSuggestions([]);
      return;
    }
    const queryText = text;
    toTimer.current = setTimeout(async () => {
      const requestId = ++toRequestId.current;
      try {
        const res = await db.getAllAsync<StopResult>(searchStopsQuery, [`%${queryText}%`, queryText]);
        if (requestId === toRequestId.current) setToSuggestions(res);
      } catch (e) {
        console.error(e);
      }
    }, 200);
  };

  const handleSelectTo = (stop: StopResult) => {
    setToStop(stop);
    setToSearchText(stop.stop_name);
    setToSuggestions([]);
  };

  // --- Existing Logic: Bus Number Search ---
  const handleBusNumberChange = (text: string) => {
    setSearchTerm(text);
    if (db) executeSearch(db, text);
  };

  // --- Execute Multi-Stop Route Search & Navigate ---
  const handleCheckBuses = async () => {
    setRouteError('');
    if (!fromStop?.stop_id || !toStop?.stop_id || !db) {
      setRouteError('Please select valid stops from the dropdown.');
      return;
    }

    if (fromStop.stop_id === toStop.stop_id) {
      setRouteError('From and To stops must be different.');
      return;
    }

    try {
      const fromStopId = fromStop.stop_id.trim();
      const toStopId = toStop.stop_id.trim();

      const tryRouteLookup = async (originId: string, destinationId: string) => {
        const routes = await db.getAllAsync<RouteResult>(getRoutesBetweenStops, [
          originId,
          destinationId,
        ]);
        return routes;
      };

      let routes = await tryRouteLookup(fromStopId, toStopId);

      if (routes.length === 0) {
        const fromCandidates = await db.getAllAsync<{ stop_id: string }>(
          'SELECT stop_id FROM stops WHERE stop_name = ? ORDER BY stop_id LIMIT 25',
          [fromStop.stop_name]
        );
        const toCandidates = await db.getAllAsync<{ stop_id: string }>(
          'SELECT stop_id FROM stops WHERE stop_name = ? ORDER BY stop_id LIMIT 25',
          [toStop.stop_name]
        );

        const candidateFromIds = Array.from(new Set([fromStopId, ...fromCandidates.map((item) => item.stop_id)]));
        const candidateToIds = Array.from(new Set([toStopId, ...toCandidates.map((item) => item.stop_id)]));

        for (const candidateFromId of candidateFromIds) {
          for (const candidateToId of candidateToIds) {
            if (candidateFromId === candidateToId) continue;
            const fallbackRoutes = await tryRouteLookup(candidateFromId, candidateToId);
            if (fallbackRoutes.length > 0) {
              routes = fallbackRoutes;
              break;
            }
          }
          if (routes.length > 0) break;
        }
      }

      const uniqueRoutes = routes.reduce<RouteResult[]>((acc, route) => {
        const key = `${route.route_short_name}::${route.trip_id}`;
        if (!acc.some((item) => `${item.route_short_name}::${item.trip_id}` === key)) {
          acc.push(route);
        }
        return acc;
      }, []);

      console.log(`Found ${uniqueRoutes.length} direct buses!`);
      if (uniqueRoutes.length === 0) {
        setRouteError(`No direct buses found from ${fromStop.stop_name} to ${toStop.stop_name}.`);
        return;
      }
      setConnectingRoutes(uniqueRoutes);
      navigation.navigate('RouteResults');
    } catch (error) {
      console.error('Error finding routes:', error);
      setRouteError('Something went wrong while finding buses. Please try again.');
    }
  };

  // Render direct bus result item using unified clean styling
  const handleSelectRoute = async (route: Route) => {
    if (!db) return;

    try {
      const tripRecords = await db.getAllAsync<{ trip_id: string }>(
        getRepresentativeRouteTrip,
        [route.route_id]
      );

      const selectedTrip = tripRecords[0];
      if (!selectedTrip) {
        console.warn('No trip found for this route.');
        return;
      }

      const timeline = await db.getAllAsync<TimelineStop>(getTripTimeline, [selectedTrip.trip_id]);
      setSelectedTripTimeline(timeline ?? []);
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Failed to load route timeline:', error);
    }
  };

  const renderRouteItem = ({ item }: { item: Route }) => (
    <TouchableOpacity 
      style={styles.suggestionItem} 
      activeOpacity={0.7}
      onPress={() => handleSelectRoute(item)}
    >
       <Text style={styles.suggestionText}>🚌 Route {item.route_short_name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
        <View>
          <Text style={styles.headerTitle}>Maargam</Text>
          <Text style={styles.headerSubtitle}>Your Hyderabad transit companion</Text>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.route_id.toString()}
        renderItem={renderRouteItem}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.topSection}>
            
            {/* 1. Point A to Point B Section */}
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <Text style={styles.cardTitle}>Plan your journey</Text>
                <Text style={styles.sectionEyebrow}>POINT TO POINT</Text>
              </View>

              {/* From Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="From — e.g. Mehdipatnam"
                  placeholderTextColor={colors.textMuted}
                  value={fromSearchText}
                  onChangeText={handleFromChange}
                />
                {fromSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {fromSuggestions.map(stop => (
                      <TouchableOpacity 
                        key={stop.stop_id} 
                        style={styles.suggestionItem}
                        onPress={() => handleSelectFrom(stop)}
                      >
                        <Text style={styles.suggestionText}>{stop.stop_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* To Input */}
              <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="To — e.g. Lingampally"
                  placeholderTextColor={colors.textMuted}
                  value={toSearchText}
                  onChangeText={handleToChange}
                />
                {toSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {toSuggestions.map(stop => (
                      <TouchableOpacity 
                        key={stop.stop_id} 
                        style={styles.suggestionItem}
                        onPress={() => handleSelectTo(stop)}
                      >
                        <Text style={styles.suggestionText}>{stop.stop_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[
                  styles.button, 
                  (!fromStop || !toStop) && styles.buttonDisabled
                ]} 
                onPress={handleCheckBuses}
                activeOpacity={0.8}
                disabled={!fromStop || !toStop}
              >
                <Text style={styles.buttonText}>Find buses</Text>
              </TouchableOpacity>
              {routeError.length > 0 && (
                <Text style={styles.errorText}>{routeError}</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* 2. Secondary: Search Route by Number */}
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <Text style={styles.cardTitle}>Know your bus number?</Text>
                <Text style={styles.sectionEyebrow}>QUICK SEARCH</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter bus number — e.g. 216"
                placeholderTextColor={colors.textMuted}
                value={searchTerm}
                onChangeText={handleBusNumberChange}
                autoCorrect={false}
                autoCapitalize="characters"
                clearButtonMode="while-editing"
              />
            </View>

            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            )}
          </View>
        }
        ListEmptyComponent={
          searchTerm.length > 0 && !isSearching ? (
          <Text style={styles.emptyText}>No routes found for “{searchTerm}”</Text>
          ) : null
        }
      />

      <TouchableOpacity style={styles.aboutLink} onPress={() => navigation.navigate('About')}>
        <Text style={styles.aboutLinkText}>About Maargam</Text>
        <Text style={styles.aboutArrow}>→</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: 'row', alignItems: 'center',
  },
  headerLogo: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
  headerTitle: { fontSize: 25, fontWeight: '800', color: colors.primary, letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  topSection: { paddingTop: 20 },
  card: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08,
    shadowRadius: 14, elevation: 3, borderWidth: 1, borderColor: colors.border,
  },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 13 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.7 },
  inputWrapper: { zIndex: 1 }, 
  input: {
    backgroundColor: '#F8FBFF', height: 52, borderRadius: 13, paddingHorizontal: 16,
    fontSize: 15, fontWeight: '600', color: colors.ink, borderWidth: 1, borderColor: colors.border,
  },
  suggestionsContainer: {
    backgroundColor: colors.surface, borderRadius: 13, marginTop: 4,
    borderWidth: 1, borderColor: colors.primaryMuted, overflow: 'hidden',
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 4,
  },
  suggestionItem: {
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  suggestionText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary, borderRadius: 13, height: 52, justifyContent: 'center',
    alignItems: 'center', marginTop: 14, shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3,
  },
  buttonDisabled: { backgroundColor: '#98BCEB', shadowOpacity: 0 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  errorText: { textAlign: 'center', marginTop: 10, fontSize: 14, color: '#B3261E', fontWeight: '600' },
  aboutLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 15, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  aboutLinkText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  aboutArrow: { color: colors.primary, fontWeight: '800', fontSize: 18 },
});
