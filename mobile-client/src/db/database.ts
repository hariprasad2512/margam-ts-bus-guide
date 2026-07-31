import * as SQLite from 'expo-sqlite';

// We open the database synchronously. 
// Expo automatically looks for this exact filename in your assets/ folder.
const db = SQLite.openDatabaseSync('tgsrtc.db');

export const getDbConnection = () => {
  return db;
};

// Example wrapper function for testing our connection later
export const testQuery = () => {
  try {

    
    // A simple query to grab the first 5 routes to ensure it works
    const result = db.getAllSync('SELECT * FROM routes LIMIT 5;');
    console.log("Database connected successfully. Sample routes:", result);
    return result;
  } catch (error) {
    console.error("Database connection failed:", error);
    return null;
  }
};

