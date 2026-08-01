import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSearchStore } from '../store/useSearchStore';

export default function TripTimelineScreen() {
  const navigation = useNavigation();
  const { selectedTripTimeline } = useSearchStore();

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