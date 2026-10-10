import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { Shelter, ShelterStatus } from '../../../types/shelter';
import { fetchAllShelters } from '../../../services/shelterService';
import { SheltersMapEngine } from '../../../components/SheltersMapEngine';
import { ShelterListCard } from '../../../components/ShelterListCard';

const STATUS_FILTERS: Array<ShelterStatus | 'All'> = ['All', 'Available', 'Limited', 'Full'];

export default function SheltersScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);
  const [districtFilterOn, setDistrictFilterOn] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ShelterStatus | 'All'>('All');

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchAllShelters();
        setShelters(all);
      } catch (e) {
        Alert.alert('Error', 'Could not load shelters. Please try again.');
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        const geocode = await Location.reverseGeocodeAsync(loc.coords);
        if (geocode?.[0]) {
          setUserDistrict(geocode[0].district || geocode[0].subregion || geocode[0].city || null);
        }
      } catch {
        // Location is optional — the screen still works with the "All districts" filter off.
      }
    })();
  }, []);

  const filteredShelters = useMemo(() => {
    return shelters.filter((s) => {
      if (districtFilterOn && userDistrict && s.district.toLowerCase() !== userDistrict.toLowerCase()) return false;
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      return true;
    });
  }, [shelters, districtFilterOn, userDistrict, statusFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shelters</Text>
        <TouchableOpacity onPress={() => router.push('/(user)/shelters/my-requests' as any)} style={styles.backBtn}>
          <Ionicons name="document-text-outline" size={22} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'map' && styles.toggleBtnActive]}
          onPress={() => setView('map')}
        >
          <Ionicons name="map-outline" size={16} color={view === 'map' ? Colors.white : Colors.textMedium} />
          <Text style={[styles.toggleText, view === 'map' && styles.toggleTextActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
          onPress={() => setView('list')}
        >
          <Ionicons name="list-outline" size={16} color={view === 'list' ? Colors.white : Colors.textMedium} />
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.districtChip, districtFilterOn && styles.districtChipActive]}
          onPress={() => setDistrictFilterOn((v) => !v)}
        >
          <Ionicons name="location" size={14} color={districtFilterOn ? Colors.white : Colors.primary} />
          <Text style={[styles.districtChipText, districtFilterOn && { color: Colors.white }]} numberOfLines={1}>
            {userDistrict ? userDistrict : 'All districts'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredShelters.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={40} color={Colors.placeholder} />
          <Text style={styles.emptyText}>No shelters match this filter.</Text>
          {districtFilterOn && userDistrict && (
            <TouchableOpacity onPress={() => setDistrictFilterOn(false)}>
              <Text style={styles.emptyLink}>Show shelters from all districts</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : view === 'map' ? (
        <SheltersMapEngine
          shelters={filteredShelters}
          userLocation={userLocation}
          onShelterTap={(id) => router.push(`/(user)/shelters/${id}` as any)}
        />
      ) : (
        <FlatList
          data={filteredShelters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ShelterListCard shelter={item} onPress={() => router.push(`/(user)/shelters/${item.id}` as any)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: 12, fontWeight: '700', color: Colors.textMedium },
  toggleTextActive: { color: Colors.white },
  districtChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#E8F5F2', marginLeft: 'auto', maxWidth: 150 },
  districtChipActive: { backgroundColor: Colors.primary },
  districtChipText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  filterChipActive: { backgroundColor: '#0B7A66', borderColor: '#0B7A66' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: Colors.textMedium },
  filterChipTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyLink: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
});
