import sqlite3
import csv
import os

# Configuration
DB_NAME = 'tgsrtc.db'
RAW_DATA_DIR = 'raw_data'

def setup_database(cursor):
    """Creates the necessary tables based on the specific TGSRTC GTFS headers."""
    print("Dropping old tables if they exist...")
    cursor.executescript("""
        DROP TABLE IF EXISTS stops;
        DROP TABLE IF EXISTS routes;
        DROP TABLE IF EXISTS trips;
        DROP TABLE IF EXISTS stop_times;
    """)

    print("Creating fresh tables...")
    
    # 1. Stops Table: Grabbing essentials, ignoring 'zone_id' and 'stop_desc'
    cursor.execute("""
        CREATE TABLE stops (
            stop_id TEXT PRIMARY KEY,
            stop_name TEXT,
            stop_lat REAL,
            stop_lon REAL
        )
    """)

    # 2. Routes Table: Updated to drop 'route_long_name' as it is missing from the source data
    cursor.execute("""
        CREATE TABLE routes (
            route_id TEXT PRIMARY KEY,
            route_short_name TEXT
        )
    """)

    # 3. Trips Table: Filtering out 'service_id' and 'trip_short_name'
    cursor.execute("""
        CREATE TABLE trips (
            trip_id TEXT PRIMARY KEY,
            route_id TEXT,
            direction_id INTEGER,
            FOREIGN KEY(route_id) REFERENCES routes(route_id)
        )
    """)

    # 4. Stop Times Table: Capturing schedules, ignoring 'timepoint'
    cursor.execute("""
        CREATE TABLE stop_times (
            trip_id TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            stop_id TEXT,
            stop_sequence INTEGER,
            FOREIGN KEY(trip_id) REFERENCES trips(trip_id),
            FOREIGN KEY(stop_id) REFERENCES stops(stop_id)
        )
    """)


# DATA INGESTION ENGINE

# INSERT Data from CSV to Table
def load_csv_to_table(cursor, filename, table_name, insert_query, extract_func):
    """Reads a CSV file and batch-inserts the data into the database."""
    filepath = os.path.join(RAW_DATA_DIR, filename)
    
    if not os.path.exists(filepath):
        print(f"⚠️ Warning: {filename} not found in {RAW_DATA_DIR}. Skipping.")
        return

    print(f"Processing {filename} into '{table_name}' table...")
    
    with open(filepath, 'r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        # Extract the necessary data row by row
        data_to_insert = [extract_func(row) for row in reader]
        
        # We extract the data into memory and push it to SQLite in massive batches. 
        # This reduces the disk I/O operations and processes millions of rows in seconds.
        cursor.executemany(insert_query, data_to_insert)
        print(f"✅ Inserted {len(data_to_insert)} records into {table_name}.")


# Standard SQLite operation scans from top to bottom
# Finding something takes a lot of time

# We build_indices (SQL) to get faster access time.
def build_indices(cursor):
    """Creates SQL indices to guarantee sub-millisecond search speeds."""
    print("Building database indices for lightning-fast mobile searches...")
    # By running CREATE INDEX, we create a B-Tree structure in the database.
    cursor.executescript("""
        CREATE INDEX idx_stop_name ON stops(stop_name);
        CREATE INDEX idx_route_short_name ON routes(route_short_name);
        CREATE INDEX idx_stoptimes_stop_id ON stop_times(stop_id);
        CREATE INDEX idx_trips_route_id ON trips(route_id);
    """)



# MAIN FUNCTION
def main():
    # Establishing Connection with our DB_NAME --> tgsrtc.db
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Creating the Necessary Tables to the DB
    setup_database(cursor)

    # Adding Data to Tables from the raw_data (which is in txt/csv format)

    # Adding data to  STOPS TABLE
    load_csv_to_table(
        cursor, 'stops.txt', 'stops',
        "INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon) VALUES (?, ?, ?, ?)",
        lambda row: (row['stop_id'], row['stop_name'], row['stop_lat'], row['stop_lon'])
    )

    # Adding data to  ROUTES Table
    load_csv_to_table(
        cursor, 'routes.txt', 'routes',
        "INSERT INTO routes (route_id, route_short_name) VALUES (?, ?)",
        lambda row: (row['route_id'], row['route_short_name'])
    )

    # Adding data to  ROUTES Table
    load_csv_to_table(
        cursor, 'trips.txt', 'trips',
        "INSERT INTO trips (trip_id, route_id, direction_id) VALUES (?, ?, ?)",
        lambda row: (row['trip_id'], row['route_id'], row.get('direction_id', 0))
    )

    # Adding data to  ROUTES Table
    load_csv_to_table(
        cursor, 'stop_times.txt', 'stop_times',
        "INSERT INTO stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence) VALUES (?, ?, ?, ?, ?)",
        lambda row: (row['trip_id'], row['arrival_time'], row['departure_time'], row['stop_id'], row['stop_sequence'])
    )

    # Create Index based Table on Databases for Faster Retrievals
    build_indices(cursor)

    # Save changes permanently to disk
    conn.commit()

    # Clean Up Resources
    conn.close()
    print(f"🎉 Success! The optimized {DB_NAME} is ready for the mobile app.")

if __name__ == "__main__":
    main()