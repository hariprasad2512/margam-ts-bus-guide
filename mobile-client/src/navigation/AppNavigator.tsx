import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchScreen from '../screens/SearchScreen';
import RouteResultsScreen from '../screens/RouteResultsScreen';
import TripTimelineScreen from '../screens/TripTimelineScreen';
import AboutScreen from '../screens/AboutScreen';

const Stack = createNativeStackNavigator();

// Define our route parameters for type safety
export type RootStackParamList = {
  Search: undefined;
  RouteResults: undefined;
  TripTimeline: undefined;
  About: undefined;
};


export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Search"
        screenOptions={{
          headerShown: false, // We are building our own custom headers
          animation: 'slide_from_right' // Smooth native slide transition
        }}
      >
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="RouteResults" component={RouteResultsScreen} />
        <Stack.Screen name="TripTimeline" component={TripTimelineScreen} />
        <Stack.Screen name="About" component={AboutScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}