import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (db) return db;

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
    const asset = Asset.fromModule(dbAsset);
    await asset.downloadAsync();

    const sourceUri = asset.localUri || asset.uri;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: dbPath,
    });
    console.log('Pre-populated database successfully copied to SQLite directory.');
  }

  // 3. Open database synchronously using the default dbName
  db = SQLite.openDatabaseSync(dbPath);
  return db;
};

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