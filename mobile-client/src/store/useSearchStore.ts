import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { Route, RouteResult, TimelineStop } from '../db/searchQueries'; 
import { searchRoutesByNumber } from '../db/searchQueries';

// Define the shape of our global search state
interface SearchState {
  // ==========================================
  // NEW: "From / To" Routing State
  // ==========================================
  fromStop: StopSelection | null;
  toStop: StopSelection | null;
  connectingRoutes: RouteResult[];
  selectedTripTimeline: TimelineStop[];
  
  setFromStop: (stop: StopSelection | null) => void;
  setToStop: (stop: StopSelection | null) => void;
  setConnectingRoutes: (routes: RouteResult[]) => void;
  setSelectedTripTimeline: (timeline: TimelineStop[]) => void;


  searchTerm: string;
  results: Route[];
  isSearching: boolean;
  setSearchTerm: (term: string) => void;
  executeSearch: (db: SQLiteDatabase | null, term: string) => Promise<void>;
}


// Define a simple type for our stop selections
export interface StopSelection {
  stop_id: string;
  stop_name: string;
}



// Create the Zustand store
export const useSearchStore = create<SearchState>((set) => ({
  // --- NEW STATE INITIALIZATION ---
  fromStop: null,
  toStop: null,
  connectingRoutes: [],
  selectedTripTimeline: [],

  // --- NEW ACTIONS ---
  setFromStop: (stop) => set({ 
    fromStop: stop,
    // Auto-clear results if the user changes their starting point
    connectingRoutes: [], 
    selectedTripTimeline: [] 
  }),
  
  setToStop: (stop) => set({ 
    toStop: stop,
    // Auto-clear results if the user changes their destination
    connectingRoutes: [], 
    selectedTripTimeline: [] 
  }),
  
  setConnectingRoutes: (routes) => set({ connectingRoutes: routes }),
  
  setSelectedTripTimeline: (timeline) => set({ selectedTripTimeline: timeline }),


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