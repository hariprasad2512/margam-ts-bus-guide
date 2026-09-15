import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SearchScreen from '../screens/SearchScreen';
import RouteResultsScreen from '../screens/RouteResultsScreen';
import TripTimelineScreen from '../screens/TripTimelineScreen';
import AboutScreen from '../screens/AboutScreen';
import PushpakScreen from '../screens/PushpakScreen';
import { colors } from '../theme';

// Home stack: search flow (type kept compatible with existing screens)
export type RootStackParamList = {
  Search: undefined;
  RouteResults: undefined;
  TripTimeline: undefined;
  About: undefined;
};

export type PushpakStackParamList = {
  Pushpak: undefined;
  TripTimeline: undefined;
};

export type TabParamList = {
  Home: undefined;
  PushpakTab: undefined;
};

const HomeStack = createNativeStackNavigator<RootStackParamList>();
const PushpakStack = createNativeStackNavigator<PushpakStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      initialRouteName="Search"
      screenOptions={{
        headerShown: false, // We are building our own custom headers
        animation: 'slide_from_right', // Smooth native slide transition
      }}
    >
      <HomeStack.Screen name="Search" component={SearchScreen} />
      <HomeStack.Screen name="RouteResults" component={RouteResultsScreen} />
      <HomeStack.Screen name="TripTimeline" component={TripTimelineScreen} />
      <HomeStack.Screen name="About" component={AboutScreen} />
    </HomeStack.Navigator>
  );
}

function PushpakStackNavigator() {
  return (
    <PushpakStack.Navigator
      initialRouteName="Pushpak"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <PushpakStack.Screen name="Pushpak" component={PushpakScreen} />
      <PushpakStack.Screen name="TripTimeline" component={TripTimelineScreen} />
    </PushpakStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
          // No Android ripple / grey press highlight.
          tabBarButton: (props) => {
            const {
              children,
              onPress,
              onLongPress,
              accessibilityLabel,
              accessibilityRole,
              accessibilityState,
              testID,
              style,
            } = props;
            return (
              <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress ?? undefined}
                accessibilityLabel={accessibilityLabel ?? undefined}
                accessibilityRole={accessibilityRole}
                accessibilityState={accessibilityState}
                testID={testID}
                style={style}
                activeOpacity={0.85}
              >
                {children}
              </TouchableOpacity>
            );
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Image
                  source={require('../../assets/tab-home.png')}
                  style={[styles.tabIcon, { tintColor: color }]}
                />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="PushpakTab"
          component={PushpakStackNavigator}
          options={{
            tabBarLabel: 'Pushpak',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Image
                  source={require('../../assets/tab-flight.png')}
                  style={[styles.tabIcon, { tintColor: color }]}
                />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.primarySoft,
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
