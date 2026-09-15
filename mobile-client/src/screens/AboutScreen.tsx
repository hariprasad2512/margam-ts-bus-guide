import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, Pressable, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { colors } from '../theme';

export default function AboutScreen() {
  const navigation = useNavigation();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const openSource = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot open link', url);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot open link', url);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>About</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Maargam</Text>
          <Text style={styles.tagline}>Your route. Made simple.</Text>
          <Text style={styles.versionText}>Version {appVersion}</Text>
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
              Maargam is an independent, privately developed app. It does not represent, speak for, or provide services on behalf of TGSRTC, the Government of Telangana, or any other government entity. It is not affiliated with or endorsed by TGSRTC.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Data Attribution</Text>
            <Text style={styles.bodyText}>
              Transit schedules and stop locations are based on General Transit Feed Specification (GTFS) data published through the Government of Telangana Open Data portal. Information may change and should be verified with the official sources below.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Data Accuracy</Text>
            <Text style={styles.bodyText}>
              While every effort is made to ensure accuracy, the developer assumes no responsibility for delays, route changes, or discrepancies in the transit schedules.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.disclaimerBlock}>
            <Text style={styles.disclaimerHeading}>Icon Credits</Text>
            <Text style={styles.bodyText}>
              Tab bar icons from Flaticon (flaticon.com): home icon and airplane icon by Freepik.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Official Information Sources</Text>
          <Text style={styles.bodyText}>
            These links identify the official sources for the government information used by this app.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Telangana Open Data GTFS collection"
            onPress={() => openSource('https://data.telangana.gov.in/collection/general-transit-feed-specification-gtfs-hyderabad')}
            style={styles.sourceLink}
          >
            <Text style={styles.sourceTitle}>Government of Telangana Open Data: Hyderabad GTFS</Text>
            <Text style={styles.sourceUrl}>https://data.telangana.gov.in/collection/general-transit-feed-specification-gtfs-hyderabad</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open official TGSRTC Open Data page"
            onPress={() => openSource('https://www.tgsrtc.telangana.gov.in/open-data')}
            style={styles.sourceLink}
          >
            <Text style={styles.sourceTitle}>Official TGSRTC Open Data</Text>
            <Text style={styles.sourceUrl}>https://www.tgsrtc.telangana.gov.in/open-data</Text>
          </Pressable>
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
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  topHeaderTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
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
  sourceLink: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 20,
  },
  sourceUrl: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 3,
  },
});
