import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { Shelter } from '../../../types/shelter';
import { fetchShelterById } from '../../../services/shelterService';
import { StatusPill } from '../../../components/StatusPill';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function ShelterDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const s = await fetchShelterById(id);
        setShelter(s);
      } catch {
        Alert.alert('Error', 'Could not load shelter details.');
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

  if (!shelter) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Shelter not found.</Text>
      </View>
    );
  }

  const canRequest = shelter.status === 'Available' || shelter.status === 'Limited';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shelter.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconBanner}>
          <Ionicons name="home" size={36} color={Colors.primary} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.name}>{shelter.name}</Text>
          <StatusPill status={shelter.status} />
        </View>
        <Text style={styles.location}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} /> {shelter.location}, {shelter.district}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{shelter.capacity}</Text>
            <Text style={styles.statLabel}>Capacity</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{shelter.currentOccupancy}</Text>
            <Text style={styles.statLabel}>Current Occupancy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.max(shelter.capacity - shelter.currentOccupancy, 0)}</Text>
            <Text style={styles.statLabel}>Spaces Left</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Facilities</Text>
        <View style={styles.facilitiesWrap}>
          {shelter.facilities.length === 0 ? (
            <Text style={styles.emptyText}>No facilities listed.</Text>
          ) : (
            shelter.facilities.map((f) => (
              <View key={f} style={styles.facilityChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.facilityText}>{f}</Text>
              </View>
            ))
          )}
        </View>

        {shelter.notes ? (
          <>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.notes}>{shelter.notes}</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton
          title={canRequest ? 'Request This Shelter' : `Shelter is ${shelter.status}`}
          disabled={!canRequest}
          onPress={() => router.push(`/(user)/shelters/request/${shelter.id}` as any)}
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
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  facilitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#EEF3F1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  facilityText: { fontSize: 12, color: Colors.textMedium, fontWeight: '600' },
  notes: { fontSize: 13, color: Colors.textMedium, lineHeight: 20, marginBottom: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#EEF3F1' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
});
