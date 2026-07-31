import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { searchRoutesByNumber, Route } from '../db/searchQueries';

// Define the shape of our global search state
interface SearchState {
  searchTerm: string;
  results: Route[];
  isSearching: boolean;
  setSearchTerm: (term: string) => void;
  executeSearch: (db: SQLiteDatabase | null, term: string) => Promise<void>;
}

// Create the Zustand store
export const useSearchStore = create<SearchState>((set) => ({
  searchTerm: '',
  results: [],
  isSearching: false,
  
  // Instantly updates the input field text
  setSearchTerm: (term) => set({ searchTerm: term }),
  
  // Triggers the SQLite query and updates the results array
  executeSearch: async (db, term) => {
    // If the input is cleared, reset the UI immediately
    if (term.trim() === '') {
      set({ results: [], isSearching: false });
      return;
    }

    if (!db) {
      set({ results: [], isSearching: false });
      return;
    }

    // If there exists a term, then isSearching == true
    set({ isSearching: true });
    
    // Call the fast local query we built in searchQueries.ts file
    const fetchedRoutes = await searchRoutesByNumber(db, term);
    
    set({ results: fetchedRoutes, isSearching: false });
  },
}));