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

// Enriched card shown on the results screen. Times stay internal-only:
// they drive the upcoming filter + sort, never rendered (static GTFS
// times are not accurate to the real world).
export interface RouteCardItem extends RouteResult {
  originStopName: string;
  arrivalTimeAtFromStop: string | null;
  arrivalMinutesFromMidnight: number | null;
  isFuture: boolean;
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

export const getRepresentativeRouteTrip = `
  SELECT trip_id
  FROM trips
  WHERE route_id = ?
  ORDER BY trip_id
  LIMIT 1;
`;

// Airport Pushpak (AC) routes serving RGIA, curated from the offline GTFS.
// Schedules come from the DB at runtime; no fares in GTFS (v1: schedules only).
export const PUSHPAK_ROUTE_SHORT_NAMES = [
  '255',
  '300/251',
  '7Z/251A',
  '92A/251',
  'AA',
  'AC',
  'AJ',
  'AK',
  'AL',
];

export const getRouteByShortName = `
  SELECT route_id, route_short_name
  FROM routes
  WHERE route_short_name = ?
  LIMIT 1;
`;

// Stops served by at least one Pushpak route — the curated picker source.
// Grouped by name: GTFS has direction-specific twin stop_ids sharing one
// name, and listing each twin produced duplicates (plus dead ends when the
// wrong twin was picked). One row per name, like the home autocomplete.
export const getPushpakServedStops = `
  SELECT MIN(s.stop_id) AS stop_id, s.stop_name
  FROM stops s
  JOIN stop_times st ON s.stop_id = st.stop_id
  JOIN trips t ON st.trip_id = t.trip_id
  JOIN routes r ON t.route_id = r.route_id
  WHERE r.route_short_name IN ('255','300/251','7Z/251A','92A/251','AA','AC','AJ','AK','AL')
  GROUP BY s.stop_name
  ORDER BY s.stop_name;
`;

// Pushpak routes going TO RGI Airport from a given stop: the user stop
// must come before an airport stop in the trip sequence. Matched by stop
// NAME across all twin stop_ids so any same-name twin resolves.
export const getPushpakRoutesToAirport = `
  SELECT r.route_short_name, MIN(t.trip_id) AS trip_id
  FROM routes r
  JOIN trips t ON r.route_id = t.route_id
  JOIN stop_times stUser ON t.trip_id = stUser.trip_id
  JOIN stops sUser ON stUser.stop_id = sUser.stop_id
  JOIN stop_times stAir ON t.trip_id = stAir.trip_id
  JOIN stops sAir ON stAir.stop_id = sAir.stop_id
  WHERE lower(sUser.stop_name) = lower(?)
    AND (lower(sAir.stop_name) LIKE '%rgi airport%' OR lower(sAir.stop_name) LIKE '%rgia%')
    AND r.route_short_name IN ('255','300/251','7Z/251A','92A/251','AA','AC','AJ','AK','AL')
    AND stUser.stop_sequence < stAir.stop_sequence
  GROUP BY r.route_short_name
  ORDER BY r.route_short_name
  LIMIT 20;
`;

// Pushpak routes coming FROM RGI Airport to a given stop: the airport
// stop must come before the user stop in the trip sequence. Matched by
// stop NAME across all twin stop_ids so any same-name twin resolves.
export const getPushpakRoutesFromAirport = `
  SELECT r.route_short_name, MIN(t.trip_id) AS trip_id
  FROM routes r
  JOIN trips t ON r.route_id = t.route_id
  JOIN stop_times stUser ON t.trip_id = stUser.trip_id
  JOIN stops sUser ON stUser.stop_id = sUser.stop_id
  JOIN stop_times stAir ON t.trip_id = stAir.trip_id
  JOIN stops sAir ON stAir.stop_id = sAir.stop_id
  WHERE lower(sUser.stop_name) = lower(?)
    AND (lower(sAir.stop_name) LIKE '%rgi airport%' OR lower(sAir.stop_name) LIKE '%rgia%')
    AND r.route_short_name IN ('255','300/251','7Z/251A','92A/251','AA','AC','AJ','AK','AL')
    AND stAir.stop_sequence < stUser.stop_sequence
  GROUP BY r.route_short_name
  ORDER BY r.route_short_name
  LIMIT 20;
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

// The FROM/TO Routing Query: only trips where the origin stop comes
// before the destination stop in sequence order (no reverse fabrication).
// One row per bus number (MIN trip as representative) so busy corridors
// don't return hundreds of trips and overwhelm the native SQLite module.
export const getRoutesBetweenStops = `
  SELECT r.route_short_name, MIN(t.trip_id) AS trip_id
  FROM routes r
  JOIN trips t ON r.route_id = t.route_id
  JOIN stop_times st1 ON t.trip_id = st1.trip_id
  JOIN stop_times st2 ON t.trip_id = st2.trip_id
  WHERE st1.stop_id = ?
    AND st2.stop_id = ?
    AND st1.stop_sequence < st2.stop_sequence
  GROUP BY r.route_short_name
  ORDER BY r.route_short_name
  LIMIT 50;
`;
