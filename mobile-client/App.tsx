import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { testQuery } from './src/db/database';

export default function App() {
  
  // We used a empty dependency array ==> it will Run the useEffect exactly ONCE 
  // once the component renders
  useEffect(() => {
    // This fires the moment the app opens to verify our offline DB is working
    testQuery();
  }, []);


  return <AppNavigator />;
}
