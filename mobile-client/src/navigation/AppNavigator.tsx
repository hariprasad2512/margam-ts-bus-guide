import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

// Temporary placeholder screens (We will move these to src/screens/ in the next step)
const SearchScreen = () => <View style={styles.container}><Text>Search Routes Offline</Text></View>;
const MapScreen = () => <View style={styles.container}><Text>Nearby Stops Map</Text></View>;
const TimetableScreen = () => <View style={styles.container}><Text>Stop Timetables</Text></View>;

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Search">
        <Stack.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: 'Margam - Bus Guide' }} 
        />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Timetable" component={TimetableScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});