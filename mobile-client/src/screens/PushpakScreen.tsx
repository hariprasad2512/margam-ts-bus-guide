import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PushpakStackParamList } from '../navigation/AppNavigator';
import { useSearchStore } from '../store/useSearchStore';
import {
  getPushpakRoutesFromAirport,
  getPushpakRoutesToAirport,
  getPushpakServedStops,
  getTripTimeline,
  RouteResult,
  StopResult,
  TimelineStop,
} from '../db/searchQueries';
import { initDatabase } from '../db/database';
import { colors } from '../theme';

type NavigationProp = NativeStackNavigationProp<PushpakStackParamList, 'Pushpak'>;
type Direction = 'to' | 'from';

const AIRPORT_LABEL = 'RGI Airport';

export default function PushpakScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [direction, setDirection] = useState<Direction>('to');
  const [servedStops, setServedStops] = useState<StopResult[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedStop, setSelectedStop] = useState<StopResult | null>(null);
  const [results, setResults] = useState<RouteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const { setSelectedTripTimeline } = useSearchStore();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const db = await initDatabase();
        const stops = await db.getAllAsync<StopResult>(getPushpakServedStops);
        if (isMounted) {
          setServedStops(stops);
          setStopsLoading(false);
        }
      } catch (e) {
        console.error('Failed to load Pushpak stops:', e);
        if (isMounted) setStopsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const filteredStops =
    searchText.trim().length === 0
      ? []
      : servedStops
          .filter((stop) => stop.stop_name.toLowerCase().includes(searchText.trim().toLowerCase()))
          .slice(0, 8);

  const handleSelectStop = (stop: StopResult) => {
    setSelectedStop(stop);
    setSearchText(stop.stop_name);
    setHasSearched(false);
    setResults([]);
    if (error) setError('');
  };

  const handleDirectionChange = (next: Direction) => {
    setDirection(next);
    setSelectedStop(null);
    setSearchText('');
    setResults([]);
    setHasSearched(false);
    if (error) setError('');
  };

  const handleFindPushpak = async () => {
    Keyboard.dismiss();
    setError('');
    if (!selectedStop) {
      setError('Please pick a stop from the list.');
      return;
    }
    setIsSearching(true);
    try {
      const db = await initDatabase();
      const query = direction === 'to' ? getPushpakRoutesToAirport : getPushpakRoutesFromAirport;
      const routes = await db.getAllAsync<RouteResult>(query, [selectedStop.stop_name]);
      setResults(routes);
      setHasSearched(true);
    } catch (e) {
      console.error('Failed to find Pushpak routes:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRoute = async (route: RouteResult) => {
    try {
      const db = await initDatabase();
      const timeline = await db.getAllAsync<TimelineStop>(getTripTimeline, [route.trip_id]);
      setSelectedTripTimeline(timeline ?? []);
      navigation.navigate('TripTimeline');
    } catch (e) {
      console.error('Failed to load Pushpak timeline:', e);
    }
  };

  const originLabel = direction === 'to' ? selectedStop?.stop_name : AIRPORT_LABEL;
  const destinationLabel = direction === 'to' ? AIRPORT_LABEL : selectedStop?.stop_name;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Airport Pushpak</Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteEyebrow}>AC AIRPORT EXPRESS</Text>
        <Text style={styles.noteText}>Static schedule from the offline timetable. No live tracking.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, direction === 'to' && styles.directionButtonActive]}
            onPress={() => handleDirectionChange('to')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: direction === 'to' }}
          >
            <Text style={[styles.directionText, direction === 'to' && styles.directionTextActive]}>
              To Airport
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, direction === 'from' && styles.directionButtonActive]}
            onPress={() => handleDirectionChange('from')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: direction === 'from' }}
          >
            <Text style={[styles.directionText, direction === 'from' && styles.directionTextActive]}>
              From Airport
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>{direction === 'to' ? 'FROM WHERE?' : 'TO WHERE?'}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={direction === 'to' ? 'e.g. LB Nagar' : 'e.g. JBS'}
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              if (selectedStop) setSelectedStop(null);
              if (hasSearched) {
                setHasSearched(false);
                setResults([]);
              }
              if (error) setError('');
            }}
          />
          {filteredStops.length > 0 && !selectedStop && (
            <View style={styles.suggestionsContainer}>
              {filteredStops.map((stop) => (
                <TouchableOpacity
                  key={stop.stop_id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectStop(stop)}
                >
                  <Text style={styles.suggestionText}>{stop.stop_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, (!selectedStop || isSearching) && styles.buttonDisabled]}
          onPress={handleFindPushpak}
          activeOpacity={0.8}
          disabled={!selectedStop || isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Find Pushpak buses</Text>
          )}
        </TouchableOpacity>
        {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {stopsLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Pushpak stops…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.route_short_name}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.routeCard}
              onPress={() => handleSelectRoute(item)}
              activeOpacity={0.7}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeNumber}>Bus {item.route_short_name}</Text>
                <Text style={styles.routeSubtitle}>
                  {originLabel} → {destinationLabel}
                </Text>
                <Text style={styles.routeHint}>Tap to view stops</Text>
              </View>
              <Text style={styles.cardChevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            hasSearched && !isSearching ? (
              <Text style={styles.emptyText}>
                No Pushpak buses found{selectedStop ? ` for ${selectedStop.stop_name}` : ''}.
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  noteCard: { backgroundColor: colors.primarySoft, padding: 14, margin: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryMuted },
  noteEyebrow: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.7, marginBottom: 4 },
  noteText: { fontSize: 14, color: colors.navy, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 8,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08,
    shadowRadius: 14, elevation: 3, borderWidth: 1, borderColor: colors.border,
  },
  directionRow: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: 13, padding: 4, marginBottom: 14 },
  directionButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  directionButtonActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryMuted },
  directionText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  directionTextActive: { color: colors.primary, fontWeight: '800' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.7, marginBottom: 6 },
  inputWrapper: { zIndex: 1 },
  input: {
    backgroundColor: '#F8FBFF', height: 52, borderRadius: 13, paddingHorizontal: 16,
    fontSize: 15, fontWeight: '600', color: colors.ink, borderWidth: 1, borderColor: colors.border,
  },
  suggestionsContainer: {
    backgroundColor: colors.surface, borderRadius: 13, marginTop: 4,
    borderWidth: 1, borderColor: colors.primaryMuted, overflow: 'hidden', zIndex: 10,
  },
  suggestionItem: {
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  suggestionText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary, borderRadius: 13, height: 52, justifyContent: 'center',
    alignItems: 'center', marginTop: 14,
  },
  buttonDisabled: { backgroundColor: '#98BCEB' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  errorText: { textAlign: 'center', marginTop: 10, fontSize: 14, color: '#B3261E', fontWeight: '600' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 },
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
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: colors.textMuted, fontWeight: '500', paddingHorizontal: 24 },
});
