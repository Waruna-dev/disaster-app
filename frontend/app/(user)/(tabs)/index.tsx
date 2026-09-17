import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../../../constants/colors';
import { DashboardHeader, DashboardStickyBar } from '../../../components/DashboardHeader';
import { AlertCard } from '../../../components/AlertCard';
import { QuickActionCard } from '../../../components/QuickActionCard';
import { UpdateListItem } from '../../../components/UpdateListItem';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [firstName, setFirstName] = useState('User');
  const [initial, setInitial] = useState('U');

  useEffect(() => {
    let unsubscribe: () => void;
    if (user?.uid) {
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.fullName) {
            const first = data.fullName.split(' ')[0];
            setFirstName(first);
            setInitial(first.charAt(0).toUpperCase());
          }
        }
      }, (error) => {
        console.error("Error fetching user data:", error);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );
  return (
    <View style={styles.container}>
      <DashboardStickyBar scrollY={scrollY} initial={initial} />
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <DashboardHeader scrollY={scrollY} firstName={firstName} />
        
        <View style={styles.alertWrapper}>
          <AlertCard />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActionsRow}>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title={t('dashboard.reportIncident')} 
                subtitle={t('dashboard.floodOrLandslide')} 
                icon="add" 
                variant="solid" 
                onPress={() => router.push('/(user)/report/create')} 
              />
            </View>
            <View style={styles.actionColumn}>
              <QuickActionCard 
                title={t('dashboard.myReports')} 
                subtitle={t('dashboard.trackReportStatus')} 
                icon="document-text-outline" 
                variant="outline" 
                onPress={() => router.push('/(user)/(tabs)/reports')} 
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>{t('dashboard.recentUpdates')}</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAllText}>{t('dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          <UpdateListItem 
            title={t('dashboard.waterLevelRising')} 
            description={t('dashboard.waterLevelDesc')} 
            icon="water" 
            iconColor="#D68910" 
            iconBg="#FEF5E7" 
          />
          
          <UpdateListItem 
            title={t('dashboard.noActiveAlerts')} 
            description={t('dashboard.noActiveAlertsDesc')} 
            icon="checkmark" 
            iconColor={Colors.success} 
            iconBg="#E8F5F2" 
          />
        </View>
        
      </Animated.ScrollView>
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
