import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Maargam</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        {/* Mission Statement */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About The App</Text>
          <Text style={styles.bodyText}>
            Maargam is a lightweight, offline-first transit guide engineered specifically for daily commuters in Hyderabad. It is built to provide fast, ad-free routing and scheduling information.
          </Text>
        </View>

        {/* Legal & Data Compliance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal & Data Disclaimers</Text>
          
          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Unofficial Application</Text>
            <Text style={styles.bodyText}>
              This application is an independent, privately developed tool. It is NOT affiliated with, endorsed by, or an official application of the Telangana State Road Transport Corporation (TGSRTC) or any government entity.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Data Attribution</Text>
            <Text style={styles.bodyText}>
              Contains data provided by TGSRTC. The transit schedules and stop locations used in this application are sourced from the General Transit Feed Specification (GTFS) data published via the Government of Telangana Open Data portal.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Data Accuracy</Text>
            <Text style={styles.bodyText}>
              While every effort is made to ensure accuracy, the developer assumes no responsibility for delays, route changes, or discrepancies in the transit schedules.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066FF',
    marginBottom: 12,
  },
  disclaimerBlock: {
    marginVertical: 8,
  },
  disclaimerHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 12,
  },
});
