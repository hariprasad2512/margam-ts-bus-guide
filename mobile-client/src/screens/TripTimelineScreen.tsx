import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSearchStore } from '../store/useSearchStore';

export default function TripTimelineScreen() {
  const navigation = useNavigation();
  const { selectedTripTimeline } = useSearchStore();

  const nextStop = useMemo(() => {
    if (!selectedTripTimeline?.length) return null;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      const safeHours = Number.isFinite(hours) ? hours : 0;
      const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
      return safeHours * 60 + safeMinutes;
    };

    const sortedStops = selectedTripTimeline
      .map((stop) => ({ ...stop, minutes: parseTime(stop.arrival_time) }))
      .filter((stop) => Number.isFinite(stop.minutes));

    const upcoming = sortedStops.find((stop) => stop.minutes >= nowMinutes); 
    return upcoming ?? sortedStops[0] ?? null;
  }, [selectedTripTimeline]);

  const formatTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    const period = safeHours >= 12 ? 'PM' : 'AM';
    const displayHour = safeHours % 12 === 0 ? 12 : safeHours % 12;
    return `${displayHour}:${safeMinutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Timeline</Text>
        <View style={{ width: 50 }} /> 
      </View>

      {nextStop && (
        <View style={styles.nextStopBanner}>
          <Text style={styles.nextStopLabel}>Next bus time</Text>
          <Text style={styles.nextStopValue}>{formatTime(nextStop.arrival_time)}</Text>
          <Text style={styles.nextStopSubtitle}>{nextStop.stop_name}</Text>
        </View>
      )}

      <FlatList
        data={selectedTripTimeline}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
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
                <Text style={styles.arrivalTime}>{item.arrival_time}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 8 },
  backText: { fontSize: 16, color: '#0066FF', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  listContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  nextStopBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#E7F0FF',
  },
  nextStopLabel: { fontSize: 12, color: '#0066FF', fontWeight: '700', textTransform: 'uppercase' },
  nextStopValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  nextStopSubtitle: { fontSize: 14, color: '#4B5563', marginTop: 2 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineGraphic: { width: 30, alignItems: 'center' },
  lineTop: { flex: 1, width: 2, backgroundColor: '#0066FF' },
  lineBottom: { flex: 1, width: 2, backgroundColor: '#0066FF' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#0066FF', zIndex: 1 },
  dotEnd: { backgroundColor: '#0066FF', width: 16, height: 16, borderRadius: 8 }, // Larger solid dot for start/end
  stopInfo: { flex: 1, paddingLeft: 16, paddingBottom: 24, justifyContent: 'center' },
  stopName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  arrivalTime: { fontSize: 14, color: '#666666' },
});