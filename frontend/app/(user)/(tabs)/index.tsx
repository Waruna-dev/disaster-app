import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { AlertCard } from '../../../components/AlertCard';
import { QuickActionCard } from '../../../components/QuickActionCard';
import { UpdateListItem } from '../../../components/UpdateListItem';
import { router, useFocusEffect } from 'expo-router';

export default function DashboardScreen() {
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
        <DashboardHeader />
        
        <View style={styles.alertWrapper}>
          <AlertCard />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActionsRow}>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title="Report incident" 
                subtitle="Flood or landslide" 
                icon="add" 
                variant="solid" 
                onPress={() => router.push('/(user)/report/create')} 
              />
            </View>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title="My reports" 
                subtitle="Track report status" 
                icon="document-text-outline" 
                variant="outline" 
                onPress={() => router.push('/(user)/(tabs)/reports')} 
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>Recent updates</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <UpdateListItem 
            title="Water level rising" 
            description="Kelaniya • 20 minutes ago" 
            icon="water" 
            iconColor="#D68910" 
            iconBg="#FEF5E7" 
          />
          
          <UpdateListItem 
            title="No active alerts in Malabe" 
            description="Area status is currently safe" 
            icon="checkmark" 
            iconColor={Colors.success} 
            iconBg="#E8F5F2" 
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
  alertWrapper: {
    zIndex: 10,
    // Note: The AlertCard itself has a negative top margin to overlap the header
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  sectionTitleNoMargin: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16, // Using gap for spacing
  },
  actionColumn: {
    flex: 1,
  },
});
