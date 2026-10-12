import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../../constants/colors';
import { AlertCard, NoAlertsCard } from '../../../components/AlertCard';
import { useNearbyWarnings } from '../../../hooks/useNearbyWarnings';
import { useTranslation } from 'react-i18next';

export default function AlertsScreen() {
  const { t } = useTranslation();
  const { alerts: nearbyAlerts, loading: nearbyLoading, error: nearbyError } = useNearbyWarnings();
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Hazard alerts in your area</Text>
          {!nearbyLoading && !nearbyError && nearbyAlerts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{nearbyAlerts.length} active</Text>
            </View>
          )}
        </View>

        {nearbyLoading ? (
          <NoAlertsCard style={styles.cardGap} message="Checking for alerts in your area…" />
        ) : nearbyError ? (
          <NoAlertsCard style={styles.cardGap} message="Could not load hazard alerts." />
        ) : nearbyAlerts.length === 0 ? (
          <NoAlertsCard style={styles.cardGap} message="No active hazard alerts in your area." />
        ) : (
          nearbyAlerts.map((w) => (
            <AlertCard key={w.id} warning={w} style={styles.cardGap} />
          ))
        )}

        <Text style={styles.text}>{t('alerts.title')}</Text>
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
    paddingTop: 56,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    flexShrink: 1,
  },
  countBadge: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  countText: {
    color: '#C0392B',
    fontWeight: '800',
    fontSize: 12,
  },
  // AlertCard's default marginTop is -40 (it overlaps the dashboard header),
  // so on this screen we override it with a normal gap.
  cardGap: {
    marginTop: 12,
  },
  text: {
    fontSize: 18,
    color: Colors.textDark,
    textAlign: 'center',
    marginTop: 24,
  },
});