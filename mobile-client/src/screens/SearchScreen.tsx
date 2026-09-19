import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Animated,
  View, 
  TextInput, 
  FlatList, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useSearchStore } from '../store/useSearchStore';
import { 
  Route, 
  RouteCardItem,
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

const LOADING_MESSAGES = [
  'Fetching buses for you…',
  'Collecting data…',
  'Finding the best options…',
];
const HAPPY_JOURNEY_MESSAGE = 'Happy Journey…';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  // Local state for the Auto-Suggest Dropdowns
  const [fromSearchText, setFromSearchText] = useState('');
  const [toSearchText, setToSearchText] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<StopResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<StopResult[]>([]);
  const [routeError, setRouteError] = useState('');
  const [isFindingBuses, setIsFindingBuses] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const loadingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Debounce + stale-response guards for the auto-suggest dropdowns.
  const fromTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fromRequestId = useRef(0);
  const toRequestId = useRef(0);

  useEffect(() => {
    const parent = navigation.getParent();
    if (loadingTimer.current) {
      clearInterval(loadingTimer.current);
      loadingTimer.current = null;
    }
    if (isFindingBuses) {
      // Hide the bottom tabs so the overlay covers the full screen.
      parent?.setOptions({
        tabBarStyle: { display: 'none' },
      });
      overlayOpacity.setValue(0);
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      // Rotate the loader messages while the search runs.
      setLoadingMessageIndex(0);
      messageOpacity.setValue(1);
      loadingTimer.current = setInterval(() => {
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setLoadingMessageIndex((prev) =>
            prev >= LOADING_MESSAGES.length - 1 ? 0 : prev + 1
          );
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        });
      }, 2600);
    } else {
      parent?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      });
    }
    return () => {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    };
  }, [isFindingBuses, navigation, overlayOpacity, messageOpacity]);

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
    setRouteCards,
    setSelectedTripTimeline,
    setSelectedFullTimeline,
    setSelectedTripMeta,
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

  const handleSwapStops = () => {
    setFromStop(toStop);
    setToStop(fromStop);
    setFromSearchText(toSearchText);
    setToSearchText(fromSearchText);
    setFromSuggestions([]);
    setToSuggestions([]);
    if (routeError) setRouteError('');
  };

  // --- Existing Logic: Bus Number Search ---
  const handleBusNumberChange = (text: string) => {
    setSearchTerm(text);
    if (db) executeSearch(db, text);
  };

  // --- Execute Multi-Stop Route Search & Navigate ---
  const handleCheckBuses = async () => {
    Keyboard.dismiss();
    setRouteError('');
    if (!fromStop?.stop_id || !toStop?.stop_id || !db) {
      setRouteError('Please select valid stops from the dropdown.');
      return;
    }

    if (fromStop.stop_id === toStop.stop_id) {
      setRouteError('From and To stops must be different.');
      return;
    }

    setIsFindingBuses(true);
    // Yield one frame so the overlay paints before the blocking SQLite work.
    await new Promise((resolve) => setTimeout(resolve, 0));

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
        if (!acc.some((item) => item.route_short_name === route.route_short_name)) {
          acc.push(route);
        }
        return acc;
      }, []).slice(0, 50);

      console.log(`Found ${uniqueRoutes.length} direct buses!`);
      if (uniqueRoutes.length === 0) {
        setRouteError(`No direct buses found from ${fromStop.stop_name} to ${toStop.stop_name}.`);
        return;
      }

      // Enrich here under the same overlay so the results screen
      // renders instantly with zero blank/loader of its own.
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const parseTimeToMinutes = (value: string | null) => {
        if (!value) return null;
        const [hours, minutes] = value.split(':').map(Number);
        const safeHours = Number.isFinite(hours) ? hours : 0;
        const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
        return safeHours * 60 + safeMinutes;
      };

      const cards: RouteCardItem[] = [];
      for (const route of uniqueRoutes) {
        try {
          const timeline = await db.getAllAsync<TimelineStop>(getTripTimeline, [route.trip_id]);
          const firstStop = timeline[0];
          const matchingStop = timeline.find(
            (stop) => stop.stop_id === fromStop.stop_id || stop.stop_name === fromStop.stop_name
          );

          const arrivalMinutes = parseTimeToMinutes(matchingStop?.arrival_time ?? null);
          const clockMinutes =
            arrivalMinutes !== null ? ((arrivalMinutes % 1440) + 1440) % 1440 : null;
          const isFuture = clockMinutes !== null && clockMinutes >= nowMinutes;

          cards.push({
            ...route,
            originStopName: firstStop?.stop_name ?? 'Unknown',
            arrivalTimeAtFromStop: matchingStop?.arrival_time ?? null,
            arrivalMinutesFromMidnight: arrivalMinutes,
            isFuture,
          });
        } catch (error) {
          console.error('Error enriching route card:', route.route_short_name, error);
        }
      }

      cards.sort((a, b) => (a.arrivalMinutesFromMidnight ?? 0) - (b.arrivalMinutesFromMidnight ?? 0));

      setConnectingRoutes(uniqueRoutes);
      setRouteCards(cards);
      // Hold the closing message before revealing the results.
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
      setLoadingMessageIndex(LOADING_MESSAGES.length);
      await new Promise((resolve) => setTimeout(resolve, 700));
      navigation.navigate('RouteResults');
    } catch (error) {
      console.error('Error finding routes:', error);
      setRouteError('Something went wrong while finding buses. Please try again.');
    } finally {
      setIsFindingBuses(false);
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
      setSelectedFullTimeline(timeline ?? []);
      // Bus-number lookup has no From/To segment: full route only,
      // so the Timeline hides the entire-route toggle.
      setSelectedTripMeta({ tripId: selectedTrip.trip_id, routeShortName: route.route_short_name, fromIndex: null, toIndex: null });
      navigation.navigate('TripTimeline');
    } catch (error) {
      console.error('Failed to load route timeline:', error);
    }
  };

  const renderRouteItem = ({ item }: { item: Route }) => (
    <TouchableOpacity 
      style={styles.routeNumberCard} 
      activeOpacity={0.7}
      onPress={() => handleSelectRoute(item)}
    >
      <View style={styles.routeNumberInfo}>
        <Text style={styles.routeNumberLabel}>ROUTE</Text>
        <Text style={styles.routeNumberBig}>{item.route_short_name}</Text>
      </View>
      <Text style={styles.routeNumberChevron}>›</Text>
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

      <KeyboardAvoidingView
        style={styles.listFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
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
            <View style={[styles.card, styles.journeyCard]}>
              <View style={styles.sectionHeading}>
                <Text style={styles.cardTitle}>Plan your journey</Text>
                <Text style={styles.sectionEyebrow}>POINT TO POINT</Text>
              </View>

              {/* From Input */}
              <View style={styles.journeyLeg}>
                <Text style={styles.journeyLegLabel}>FROM</Text>
                <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.journeyInput}
                  placeholder="e.g. Mehdipatnam"
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
              </View>

              {/* Swap From / To — embedded at the seam */}
              <TouchableOpacity
                style={styles.swapSeamButton}
                onPress={handleSwapStops}
                activeOpacity={0.7}
                accessibilityLabel="Swap From and To"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                disabled={!fromStop && !toStop && !fromSearchText && !toSearchText}
              >
                <Text style={styles.swapSeamGlyph}>⇅</Text>
              </TouchableOpacity>

              {/* To Input */}
              <View style={[styles.journeyLeg, { marginTop: 10 }]}>
                <Text style={styles.journeyLegLabel}>TO</Text>
                <View style={[styles.inputWrapper]}>
                <TextInput
                  style={styles.journeyInput}
                  placeholder="e.g. Lingampally"
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
              </View>

              <TouchableOpacity 
                style={[
                  styles.button, 
                  (!fromStop || !toStop || isFindingBuses) && styles.buttonDisabled
                ]} 
                onPress={handleCheckBuses}
                activeOpacity={0.8}
                disabled={!fromStop || !toStop || isFindingBuses}
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
      </KeyboardAvoidingView>

      <TouchableOpacity style={styles.aboutLink} onPress={() => navigation.navigate('About')}>
        <Text style={styles.aboutLinkText}>About Maargam</Text>
        <Text style={styles.aboutArrow}>→</Text>
      </TouchableOpacity>

      {isFindingBuses && (
        <Animated.View style={[styles.loadingOverlay, { opacity: overlayOpacity }]}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Animated.View style={{ opacity: messageOpacity }}>
              <Text style={styles.loadingText}>
                {loadingMessageIndex >= LOADING_MESSAGES.length
                  ? HAPPY_JOURNEY_MESSAGE
                  : LOADING_MESSAGES[loadingMessageIndex]}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      )}
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
  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  listFlex: { flex: 1 },
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
    zIndex: 10,
  },
  suggestionItem: {
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  suggestionText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  routeNumberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 10, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 2,
  },
  routeNumberInfo: { flex: 1 },
  routeNumberLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.7 },
  routeNumberBig: { fontSize: 28, fontWeight: '800', color: colors.navy, marginTop: 2 },
  routeNumberChevron: { fontSize: 24, color: colors.primary, fontWeight: '800', marginLeft: 8 },
  journeyCard: { position: 'relative' },
  journeyLeg: {
    backgroundColor: '#F8FBFF', borderRadius: 13, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  journeyLegLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.7, marginBottom: 2 },
  journeyInput: {
    height: 44, fontSize: 17, fontWeight: '700', color: colors.ink, paddingHorizontal: 2,
  },
  swapSeamButton: {
    position: 'absolute', right: 28, top: '50%', marginTop: -24, zIndex: 5,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  swapSeamGlyph: { fontSize: 20, color: colors.primary, fontWeight: '800', textAlign: 'center' },
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,42,82,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingCard: {
    backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 32,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.navy, fontWeight: '700' },
});
