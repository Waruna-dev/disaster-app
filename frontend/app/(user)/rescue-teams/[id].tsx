import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { RescueTeam } from '../../../types/rescueTeam';
import { fetchRescueTeamById } from '../../../services/rescueTeamService';
import { StatusPill } from '../../../components/StatusPill';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function RescueTeamDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<RescueTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const t = await fetchRescueTeamById(id);
        setTeam(t);
      } catch {
        Alert.alert('Error', 'Could not load rescue team details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Rescue team not found.</Text>
      </View>
    );
  }

  const canRequest = team.status === 'Available';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconBanner}>
          <Ionicons name="people" size={36} color={Colors.primary} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.name}>{team.name}</Text>
          <StatusPill status={team.status} />
        </View>
        <Text style={styles.location}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} /> {team.currentLocationLabel || team.district}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.type}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.members}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.district}</Text>
            <Text style={styles.statLabel}>District</Text>
          </View>
        </View>

        {team.equipment ? (
          <>
            <Text style={styles.sectionTitle}>Equipment</Text>
            <Text style={styles.notes}>{team.equipment}</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton
          title={canRequest ? 'Request This Team' : `Team is ${team.status}`}
          disabled={!canRequest}
          onPress={() => router.push(`/(user)/rescue-teams/request/${team.id}` as any)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textDark },
  content: { padding: 20, paddingBottom: 20 },
  iconBanner: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textDark, flex: 1, marginRight: 8 },
  location: { fontSize: 13, color: Colors.textMuted, marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statBox: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EEF3F1' },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  notes: { fontSize: 13, color: Colors.textMedium, lineHeight: 20, marginBottom: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#EEF3F1' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
});
