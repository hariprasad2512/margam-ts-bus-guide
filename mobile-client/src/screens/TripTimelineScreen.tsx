import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSearchStore } from '../store/useSearchStore';
import { TimelineStop } from '../db/searchQueries';
import { colors } from '../theme';

export default function TripTimelineScreen() {
  const navigation = useNavigation();
  const { selectedTripTimeline, selectedFullTimeline, selectedTripMeta } = useSearchStore();
  const [showFullRoute, setShowFullRoute] = useState(false);
  const listRef = useRef<FlatList<TimelineStop> | null>(null);

  // The toggle only exists for From/To flows where we know the
  // segment boundaries inside the full route. Bus-number lookup,
  // Pushpak, and fallback full-route cases carry null indices.
  const hasSegment =
    selectedTripMeta?.fromIndex != null &&
    selectedTripMeta?.toIndex != null &&
    selectedFullTimeline.length > 0;

  const fromIndex = selectedTripMeta?.fromIndex ?? 0;
  const toIndex = selectedTripMeta?.toIndex ?? 0;
  const showingFull = showFullRoute && hasSegment;
  const displayList = showingFull ? selectedFullTimeline : selectedTripTimeline;

  const scrollToBoardingStop = () => {
    // Let the full list render first, then jump to the boarding stop
    // so the user keeps context instead of landing at the depot.
    setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: fromIndex, animated: true, viewPosition: 0.2 });
      } catch {
        // scrollToIndex can throw before layout: fall back to top.
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    }, 100);
  };

  const handleToggleRoute = () => {
    if (!showFullRoute) scrollToBoardingStop();
    setShowFullRoute((prev) => !prev);
  };

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
        ref={listRef}
        data={displayList}
        keyExtractor={(item, index) => `${item.stop_id}-${index}`}
        contentContainerStyle={styles.listContainer}
        onScrollToIndexFailed={() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
        ListHeaderComponent={
          hasSegment ? (
            <View style={styles.toggleWrap}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={handleToggleRoute}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  showingFull
                    ? 'Show only my ride'
                    : `View entire route of bus ${selectedTripMeta?.routeShortName ?? ''}`
                }
              >
                <Text style={styles.toggleButtonText}>
                  {showingFull
                    ? `Show only my ride (${selectedTripTimeline.length} stops)`
                    : `View Entire Route of Bus ${selectedTripMeta?.routeShortName ?? ''} (${selectedFullTimeline.length} stops)`}
                </Text>
              </TouchableOpacity>
              {showingFull && selectedFullTimeline.length > 0 && (
                <Text style={styles.toggleHint}>
                  Starts at {selectedFullTimeline[0].stop_name} • greyed stops are outside your ride
                </Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stops found for this trip.</Text>
        }
        renderItem={({ item, index }) => {
          const listLength = displayList.length;
          const isFirst = index === 0;
          const isLast = index === listLength - 1;
          // In full-route mode, stops outside the user's From→To
          // segment render dimmed/greyed; the segment stays lit.
          const isDimmed = showingFull && (index < fromIndex || index > toIndex);
          const isBoarding = showingFull && index === fromIndex;
          const isAlighting = showingFull && index === toIndex;
          
          return (
            <View style={[styles.timelineRow, isDimmed && styles.timelineRowDimmed]}>
              {/* Vertical Line & Dot */}
              <View style={styles.timelineGraphic}>
                {!isFirst && <View style={[styles.lineTop, isDimmed && styles.lineDimmed]} />}
                <View style={[styles.dot, (isFirst || isLast) && styles.dotEnd, isDimmed && styles.dotDimmed, (isBoarding || isAlighting) && styles.dotHighlight]} />
                {!isLast && <View style={[styles.lineBottom, isDimmed && styles.lineDimmed]} />}
              </View>

              {/* Stop Information */}
              <View style={styles.stopInfo}>
                <Text style={[styles.stopName, isDimmed && styles.stopNameDimmed]}>{item.stop_name}</Text>
                {isBoarding && <Text style={styles.badgeBoard}>Board here</Text>}
                {isAlighting && !isBoarding && <Text style={styles.badgeAlight}>Get down here</Text>}
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
  toggleWrap: { marginBottom: 12, alignItems: 'center' },
  toggleButton: {
    backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.primaryMuted, alignSelf: 'center',
  },
  toggleButtonText: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  toggleHint: { marginTop: 8, fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
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
  timelineRowDimmed: { opacity: 0.45 },
  timelineGraphic: { width: 30, alignItems: 'center' },
  lineTop: { flex: 1, width: 2, backgroundColor: colors.primaryMuted },
  lineBottom: { flex: 1, width: 2, backgroundColor: colors.primaryMuted },
  lineDimmed: { backgroundColor: '#C3CDD9' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary, zIndex: 1 },
  dotEnd: { backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8 }, // Larger solid dot for start/end
  dotDimmed: { borderColor: '#9AA5B1', backgroundColor: colors.surface },
  dotHighlight: { borderColor: colors.success, backgroundColor: colors.success },
  stopInfo: { flex: 1, paddingLeft: 16, paddingBottom: 24, justifyContent: 'center' },
  stopName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  stopNameDimmed: { color: colors.textMuted, fontWeight: '600' },
  badgeBoard: {
    marginTop: 4, alignSelf: 'flex-start', fontSize: 11, fontWeight: '800',
    color: colors.success, backgroundColor: '#E6F6EC',
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, overflow: 'hidden',
  },
  badgeAlight: {
    marginTop: 4, alignSelf: 'flex-start', fontSize: 11, fontWeight: '800',
    color: colors.primary, backgroundColor: colors.primarySoft,
    paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, overflow: 'hidden',
  },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
});
