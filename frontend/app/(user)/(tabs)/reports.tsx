import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../../constants/colors';
import { ReportsHeader } from '../../../components/ReportsHeader';
import { StatsCard } from '../../../components/StatsCard';
import { FilterPills } from '../../../components/FilterPills';
import { ReportCard } from '../../../components/ReportCard';
import { useFocusEffect } from 'expo-router';

export default function ReportsScreen() {
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ReportsHeader />
        
        <StatsCard />

        <FilterPills />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent reports</Text>

          <ReportCard 
            type="flood"
            status="pending"
            id="FG-1042"
            location="Biyagama Road, Kelaniya"
            date="28 Aug 2026"
          />

          <ReportCard 
            type="flood"
            status="approved"
            id="FG-1028"
            location="Railway Road, Kelaniya"
            date="25 Aug 2026"
          />

          <ReportCard 
            type="landslide"
            status="rejected"
            id="FG-0994"
            location="Malabe town area"
            date="20 Aug 2026"
            rejectReason="Location evidence was unclear"
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40, // padding for the map button overlap
  },
  section: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  }
});
