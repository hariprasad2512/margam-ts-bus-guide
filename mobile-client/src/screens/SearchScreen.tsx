import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
} from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { useSearchStore } from '../store/useSearchStore';
import { Route } from '../db/searchQueries';
import { initDatabase } from '../db/database';

export default function SearchScreen() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  
  // Destructure our Zustand state
  const { searchTerm, results, isSearching, setSearchTerm, executeSearch } = useSearchStore();

  useEffect(() => {
    let isMounted = true;

    initDatabase()
      .then((database) => {
        if (isMounted) {
          setDb(database);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize database for search screen:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle typing: Update UI instantly, query database in background
  const handleTextChange = (text: string) => {
    setSearchTerm(text);
    if (db) {
      executeSearch(db, text);
    }
  };

  // Clean, high-contrast list item design
  const renderItem = ({ item }: { item: Route }) => (
    <TouchableOpacity style={styles.resultItem} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>🚌</Text>
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.routeNumber}>{item.route_short_name}</Text>
        <Text style={styles.routeSubtitle}>Tap to view stops</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Route</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter bus number (e.g., 216, 113M)"
          placeholderTextColor="#A0A0A0"
          value={searchTerm}
          onChangeText={handleTextChange}
          autoCorrect={false}
          autoCapitalize="characters"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.route_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3, 
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    backgroundColor: '#F0F4FF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 22,
  },
  resultTextContainer: {
    flex: 1,
  },
  routeNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
  },
});