import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { StatusPill } from '../../components/StatusPill';
import { Shelter } from '../../types/shelter';
import { fetchAllShelters, deleteShelter } from '../../services/shelterService';

type StatusFilter = 'All Status' | 'Available' | 'Limited' | 'Full' | 'Closed';

export default function DmcSheltersScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All Status');

  const load = useCallback(async () => {
    try {
      const data = await fetchAllShelters();
      setShelters(data);
    } catch {
      Alert.alert('Error', 'Could not load shelters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    return shelters.filter((s) => {
      if (statusFilter !== 'All Status' && s.status !== statusFilter) return false;
      if (search.trim() && !`${s.name} ${s.location} ${s.district}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [shelters, search, statusFilter]);

  const stats = useMemo(() => {
    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
    const available = shelters.filter((s) => s.status === 'Available').length;
    const full = shelters.filter((s) => s.status === 'Full').length;
    return { total: shelters.length, totalCapacity, totalOccupancy, available, full };
  }, [shelters]);

  const handleDelete = (shelter: Shelter) => {
    Alert.alert('Remove Shelter', `Remove "${shelter.name}" from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteShelter(shelter.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · SHELTERS" title="View and Manage Shelters" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <StatTile icon="home" value={String(stats.total)} label="Total Shelters" tint="#1D6FC4" tintBg="#E3F0FC" compact />
              <StatTile icon="checkmark-circle" value={String(stats.available)} label="Available" tint="#2E7D32" tintBg="#E6F4EA" compact />
              <StatTile icon="alert-circle" value={String(stats.full)} label="Full" tint="#D32F2F" tintBg="#FCE8E8" compact />
              <StatTile icon="people" value={`${stats.totalOccupancy}/${stats.totalCapacity}`} label="Occupancy" tint={Colors.primary} tintBg="#E8F5F2" compact />
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(DMC)/shelter-form' as any)}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>Add New Shelter</Text>
            </TouchableOpacity>

            <View style={styles.requestsLinkRow}>
              <TouchableOpacity style={styles.requestsLink} onPress={() => router.push('/(DMC)/shelter-requests' as any)}>
                <Ionicons name="mail-open-outline" size={16} color={Colors.primary} />
                <Text style={styles.requestsLinkText}>View Citizen Shelter Requests</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={Colors.placeholder} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search shelter name or location..."
                placeholderTextColor={Colors.placeholder}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View style={styles.filterRow}>
              {(['All Status', 'Available', 'Limited', 'Full', 'Closed'] as StatusFilter[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
                  <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
            {!loading && filtered.length === 0 && <Text style={styles.emptyText}>No shelters found.</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>{item.location}, {item.district}</Text>
              <Text style={styles.rowMeta}>Capacity {item.capacity} · Occupancy {item.currentOccupancy}</Text>
            </View>
            <StatusPill status={item.status} />
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/(DMC)/shelter-form', params: { id: item.id } } as any)}>
                <Ionicons name="create-outline" size={18} color={Colors.textMedium} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <DMCTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 14 },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  requestsLinkRow: { marginBottom: 14 },
  requestsLink: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5F2', borderRadius: 12, padding: 12 },
  requestsLinkText: { flex: 1, color: Colors.primary, fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder, paddingHorizontal: 14, marginBottom: 10, height: 46 },
  searchInput: { flex: 1, fontSize: 13, color: Colors.textDark },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  filterChipActive: { backgroundColor: '#0B7A66', borderColor: '#0B7A66' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: Colors.textMedium },
  filterChipTextActive: { color: Colors.white },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: 30 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEF3F1', gap: 10 },
  rowMain: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  rowMeta: { fontSize: 11, color: Colors.textMuted },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F9F7' },
});
