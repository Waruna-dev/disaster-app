import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Colors } from '../../../constants/colors';
import { ReportsHeader, ReportsStickyBar } from '../../../components/ReportsHeader';
import { StatsCard } from '../../../components/StatsCard';
import { FilterPills } from '../../../components/FilterPills';
import { ReportCard } from '../../../components/ReportCard';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { fetchUserReports } from '../../../services/reportService';
import { useTranslation } from 'react-i18next';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const loadReports = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await fetchUserReports(user.uid);
      setReports(data);
    } catch (error) {
      console.log('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      loadReports();
    }, [user])
  );

  const total = reports.length;
  const pending = reports.filter(r => r.status?.toLowerCase() === 'pending').length;
  const approved = reports.filter(r => r.status?.toLowerCase() === 'verified' || r.status?.toLowerCase() === 'approved').length;

  const filteredReports = reports.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return r.status?.toLowerCase() === 'pending';
    if (filter === 'Approved') return r.status?.toLowerCase() === 'verified' || r.status?.toLowerCase() === 'approved';
    if (filter === 'Rejected') return r.status?.toLowerCase() === 'rejected';
    return true;
  });

  return (
    <View style={styles.container}>
      <ReportsStickyBar scrollY={scrollY} />
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <ReportsHeader scrollY={scrollY} />
        
        <StatsCard total={total} pending={pending} approved={approved} />

        <FilterPills activeFilter={filter} onSelectFilter={setFilter} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reports.recentReports')}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : filteredReports.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.placeholder }}>{t('reports.noReports')}</Text>
          ) : (
            filteredReports.map(report => {
              const d = report.createdAt?.toDate ? report.createdAt.toDate() : new Date();
              const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <ReportCard 
                  key={report.id}
                  type={report.disasterType === 'Flood' ? 'flood' : report.disasterType === 'Landslide' ? 'landslide' : report.disasterType || 'flood'}
                  status={report.status?.toLowerCase() === 'verified' ? 'approved' : report.status?.toLowerCase() === 'rejected' ? 'rejected' : 'pending'}
                  id={report.referenceNumber || report.id.substring(0, 8)}
                  location={report.affectedArea || 'Unknown Location'}
                  date={dateStr}
                  rejectReason={report.rejectReason}
                  onPress={() => router.push({ pathname: '/(user)/report/[id]', params: { id: report.id } })}
                />
              );
            })
          )}
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
    paddingBottom: 40,
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
