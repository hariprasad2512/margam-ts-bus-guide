import { SQLiteDatabase } from 'expo-sqlite';

// Define the strict TypeScript shape of our route data based on our schema
export interface Route {
  route_id: string;
  route_short_name: string;
}

// SCHEMA for Result coming on a particular Route
export interface RouteResult {
  route_short_name: string;
  trip_id: string;
}

// Arrange the Stops according to the stop_sequence
export interface TimelineStop {
  stop_id: string;
  stop_name: string;
  arrival_time: string;
  stop_sequence: number;
}




// SEARCH ROUTES BY NUMBER
// The core search function
export const searchRoutesByNumber = async (db: SQLiteDatabase, searchTerm: string): Promise<Route[]> => {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }

  // We use the LIKE operator for autocomplete functionality
  // LIMIT 20 ensures the UI doesn't choke on massive lists
  const query = `
    SELECT DISTINCT route_id, route_short_name
    FROM routes
    WHERE route_short_name LIKE ?
    ORDER BY route_short_name
    LIMIT 10;
  `;

  try {
    // Append the wildcard '%' to search for anything starting with the input
    const formattedSearch = `${searchTerm.toUpperCase()}%`;
    
    // Execute the native async query
    const results = await db.getAllAsync<Route>(query, [formattedSearch]);
    return results;
  } catch (error) {
    console.error("Route search query failed:", error);
    return [];
  }
};



// 3. The Timeline Query for a specific trip
export const getTripTimeline = `
  SELECT st.stop_id, s.stop_name, st.arrival_time, st.stop_sequence
  FROM stop_times st
  JOIN stops s ON st.stop_id = s.stop_id
  WHERE st.trip_id = ?
  ORDER BY st.stop_sequence ASC;
`;


export interface StopResult {
  stop_id: string;
  stop_name: string;
}

// 1. Stop autocomplete: surface the most relevant stop matches first
export const searchStopsQuery = `
  SELECT MIN(stop_id) as stop_id, stop_name
  FROM stops
  WHERE lower(stop_name) LIKE lower(?)
  GROUP BY stop_name
  ORDER BY CASE
    WHEN lower(stop_name) = lower(?) THEN 0
    ELSE 1
  END, stop_name
  LIMIT 8;
`;

// The FROM/TO Routing Query
export const getRoutesBetweenStops = `
  SELECT DISTINCT r.route_short_name, t.trip_id
  FROM routes r
  JOIN trips t ON r.route_id = t.route_id
  JOIN stop_times st1 ON t.trip_id = st1.trip_id
  JOIN stop_times st2 ON t.trip_id = st2.trip_id
  WHERE (
    (st1.stop_id = ? AND st2.stop_id = ?)
    OR
    (st1.stop_id = ? AND st2.stop_id = ?)
  )
  AND st1.stop_sequence <> st2.stop_sequence;
`;
