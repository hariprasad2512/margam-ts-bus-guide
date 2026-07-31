import { SQLiteDatabase } from 'expo-sqlite';

// Define the strict TypeScript shape of our route data based on our schema
export interface Route {
  route_id: string;
  route_short_name: string;
}

// The core search function
export const searchRoutesByNumber = async (db: SQLiteDatabase, searchTerm: string): Promise<Route[]> => {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }

  // We use the LIKE operator for autocomplete functionality
  // LIMIT 20 ensures the UI doesn't choke on massive lists
  const query = `
    SELECT route_id, route_short_name 
    FROM routes 
    WHERE route_short_name LIKE ? 
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