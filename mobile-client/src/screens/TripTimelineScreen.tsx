import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSearchStore } from '../store/useSearchStore';
import { colors } from '../theme';

export default function TripTimelineScreen() {
  const navigation = useNavigation();
  const { selectedTripTimeline } = useSearchStore();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Timeline</Text>
        <View style={styles.headerSpacer} /> 
      </View>

      <FlatList
        data={selectedTripTimeline}
        keyExtractor={(item, index) => `${item.stop_id}-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stops found for this trip.</Text>
        }
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === selectedTripTimeline.length - 1;
          
          return (
            <View style={styles.timelineRow}>
              {/* Vertical Line & Dot */}
              <View style={styles.timelineGraphic}>
                {!isFirst && <View style={styles.lineTop} />}
                <View style={[styles.dot, isFirst || isLast ? styles.dotEnd : null]} />
                {!isLast && <View style={styles.lineBottom} />}
              </View>

              {/* Stop Information */}
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{item.stop_name}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  backChevron: { fontSize: 24, color: colors.primary, fontWeight: '800', marginTop: -2 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.navy },
  headerSpacer: { width: 40 },
  listContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  nextStopBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  nextStopLabel: { fontSize: 12, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  nextStopValue: { fontSize: 20, fontWeight: '700', color: colors.navy, marginTop: 4 },
  nextStopSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineGraphic: { width: 30, alignItems: 'center' },
  lineTop: { flex: 1, width: 2, backgroundColor: colors.primaryMuted },
  lineBottom: { flex: 1, width: 2, backgroundColor: colors.primaryMuted },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, zIndex: 1 },
  dotEnd: { backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8 }, // Larger solid dot for start/end
  stopInfo: { flex: 1, paddingLeft: 16, paddingBottom: 24, justifyContent: 'center' },
  stopName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
});
