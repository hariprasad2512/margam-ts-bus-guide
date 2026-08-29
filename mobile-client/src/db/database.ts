import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
// Initialise the Database 

// Copy the database from Assets folder to sqlite folder (internal)
// Testing whether the sqlite db is there or not!
let db: SQLite.SQLiteDatabase | null = null;
let databaseInitialisation: Promise<SQLite.SQLiteDatabase> | null = null;

export type DatabaseProgressHandler = (message: string) => void;

export const initDatabase = (onProgress?: DatabaseProgressHandler) => {
  if (db) return Promise.resolve(db);

  // React development mode can mount effects more than once. Share one copy/open
  // operation so two callers never copy the 53 MB database to the same path.
  if (!databaseInitialisation) {
    databaseInitialisation = initialiseDatabase(onProgress).catch((error) => {
      databaseInitialisation = null;
      throw error;
    });
  }

  return databaseInitialisation;
};

async function initialiseDatabase(onProgress?: DatabaseProgressHandler) {
  onProgress?.('Preparing transit data…');

  const dbName = 'tgsrtc.db';
  const dbAsset = require('../../assets/tgsrtc.db');

  const dbDirectory = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbDirectory}/${dbName}`;

  // 1. Ensure the SQLite directory exists
  const dirInfo = await FileSystem.getInfoAsync(dbDirectory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });
  }

  // 2. Check if the database file is already present
  const fileInfo = await FileSystem.getInfoAsync(dbPath);

  // If it doesn't exist or is empty (0 bytes), copy the bundled asset
  if (!fileInfo.exists || fileInfo.size === 0) {
    onProgress?.('Downloading offline routes…');
    const asset = Asset.fromModule(dbAsset);
    await asset.downloadAsync();

    const sourceUri = asset.localUri || asset.uri;
    if (!sourceUri) {
      throw new Error('The bundled transit database could not be located.');
    }

    // Copy to a temporary file first. This prevents an interrupted first launch
    // from leaving a partial database that future launches would try to reuse.
    onProgress?.('Installing offline routes…');
    const temporaryPath = `${dbPath}.tmp`;
    await FileSystem.deleteAsync(temporaryPath, { idempotent: true });
    await FileSystem.copyAsync({
      from: sourceUri,
      to: temporaryPath,
    });
    await FileSystem.moveAsync({ from: temporaryPath, to: dbPath });
    console.log('Pre-populated database successfully copied to SQLite directory.');
  }

  onProgress?.('Opening offline routes…');
  // The database name and directory must be passed separately; providing the
  // absolute path as the name makes Expo construct an invalid nested path.
  const database = await SQLite.openDatabaseAsync(dbName, undefined, dbDirectory);
  const check = await database.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
  if (check?.quick_check !== 'ok') {
    await database.closeAsync();
    throw new Error('The local transit database is incomplete. Restart the app to install it again.');
  }

  db = database;
  onProgress?.('Transit data is ready.');
  return db;
}

export const testQuery = async () => {
  try {
    const database = await initDatabase();

    const result = database.getAllSync('SELECT * FROM routes LIMIT 5;');
    console.log('Database connected successfully! Sample routes: \n', result);
    return result;
  } catch (error) {
    console.error('Database query failed:', error);
    return null;
  }
};
