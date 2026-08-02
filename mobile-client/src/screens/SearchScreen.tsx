import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
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

  // Destructure exact Zustand state (removed timeline getters as they moved to other screens)
  const {
    fromStop,
    toStop,
    setFromStop,
    setToStop,
    connectingRoutes,
    setConnectingRoutes,
    selectedTripTimeline,
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
  const handleFromChange = async (text: string) => {
    setFromSearchText(text);
    if (fromStop) setFromStop(null);
    
    if (text.trim().length > 1 && db) {
      try {
        const res = await db.getAllAsync<StopResult>(searchStopsQuery, [`%${text}%`, text]);
        setFromSuggestions(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setFromSuggestions([]);
    }
  };

  const handleSelectFrom = (stop: StopResult) => {
    setFromStop(stop);
    setFromSearchText(stop.stop_name);
    setFromSuggestions([]);
  };

  // --- Auto-Suggest Logic for "To" Stop ---
  const handleToChange = async (text: string) => {
    setToSearchText(text);
    if (toStop) setToStop(null);
    
    if (text.trim().length > 1 && db) {
      try {
        const res = await db.getAllAsync<StopResult>(searchStopsQuery, [`%${text}%`, text]);
        setToSuggestions(res);
      } catch (e) {
        console.error(e);
      }
    } else {
      setToSuggestions([]);
    }
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
    if (!fromStop?.stop_id || !toStop?.stop_id || !db) {
      console.warn('Please select valid stops from the dropdown.');
      return;
    }

    try {
      const fromStopId = fromStop.stop_id.trim();
      const toStopId = toStop.stop_id.trim();

      const tryRouteLookup = async (originId: string, destinationId: string) => {
        const routes = await db.getAllAsync<RouteResult>(getRoutesBetweenStops, [
          originId,
          destinationId,
          destinationId,
          originId,
        ]);
        return routes;
      };

      let routes = await tryRouteLookup(fromStopId, toStopId);

      if (routes.length === 0) {
        const fromCandidates = await db.getAllAsync<{ stop_id: string }>(
          'SELECT stop_id FROM stops WHERE stop_name = ? ORDER BY stop_id',
          [fromStop.stop_name]
        );
        const toCandidates = await db.getAllAsync<{ stop_id: string }>(
          'SELECT stop_id FROM stops WHERE stop_name = ? ORDER BY stop_id',
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
      setConnectingRoutes(uniqueRoutes);
      navigation.navigate('RouteResults');
    } catch (error) {
      console.error('Error finding routes:', error);
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
       <Text style={styles.suggestionText}>🚌  Route {item.route_short_name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Maargam</Text>
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
              <Text style={styles.cardTitle}>Find Route</Text>

              {/* From Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="From (e.g., Mehdipatnam)"
                  placeholderTextColor="#A0A0A0"
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
                  placeholder="To (e.g., Lingampally)"
                  placeholderTextColor="#A0A0A0"
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
                <Text style={styles.buttonText}>Check Buses in Route</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* 2. Secondary: Search Route by Number */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Search Route by Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter bus number (e.g., 216, 113M)"
                placeholderTextColor="#A0A0A0"
                value={searchTerm}
                onChangeText={handleBusNumberChange}
                autoCorrect={false}
                autoCapitalize="characters"
                clearButtonMode="while-editing"
              />
            </View>

            {isSearching && (
              <ActivityIndicator size="small" color="#0066FF" style={{ marginVertical: 10 }} />
            )}
          </View>
        }
        ListEmptyComponent={
          searchTerm.length > 0 && !isSearching ? (
            <Text style={styles.emptyText}>No routes found for "{searchTerm}"</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  topSection: { paddingTop: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05,
    shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  inputWrapper: { zIndex: 1 }, 
  input: {
    backgroundColor: '#F8F9FA', height: 50, borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, fontWeight: '600', color: '#1A1A1A', borderWidth: 1, borderColor: '#E9ECEF',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#E9ECEF', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 4,
  },
  suggestionItem: {
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F8F9FA',
    backgroundColor: '#FFFFFF', 
  },
  suggestionText: { fontSize: 15, color: '#343A40', fontWeight: '500' },
  button: {
    backgroundColor: '#0066FF', borderRadius: 12, height: 50, justifyContent: 'center',
    alignItems: 'center', marginTop: 14,
  },
  buttonDisabled: { backgroundColor: '#A0C4FF' }, 
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#E9ECEF', marginVertical: 8 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15, color: '#888888', fontWeight: '500' },
});