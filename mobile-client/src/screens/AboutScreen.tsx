import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Maargam</Text>
          <Text style={styles.tagline}>Your route. Made simple.</Text>
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
    backgroundColor: colors.canvas,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logo: { width: 112, height: 112, borderRadius: 28, marginBottom: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 8,
  },
  tagline: { fontSize: 15, color: colors.navy, fontWeight: '700', marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  disclaimerBlock: {
    marginVertical: 8,
  },
  disclaimerHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
});
