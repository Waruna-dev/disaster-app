import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Pressable, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatusPill } from '../../components/StatusPill';
import { ShelterRequest , Shelter } from '../../types/shelter';
import { fetchAllShelterRequests, assignShelterToRequest, updateShelterRequestStatus } from '../../services/shelterRequestService';
import { fetchAllShelters } from '../../services/shelterService';

type Filter = 'Pending' | 'Assigned' | 'Rejected' | 'All';

function formatDate(request: ShelterRequest) {
  const date = request.createdAt?.toDate?.();
  if (!date) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ShelterRequestsScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const [requests, setRequests] = useState<ShelterRequest[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('Pending');
  const [assignTarget, setAssignTarget] = useState<ShelterRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const [reqData, shelterData] = await Promise.all([fetchAllShelterRequests(), fetchAllShelters()]);
      setRequests(reqData);
      setShelters(shelterData);
    } catch {
      Alert.alert('Error', 'Could not load shelter requests.');
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
    if (filter === 'All') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const handleReject = (request: ShelterRequest) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this shelter request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          await updateShelterRequestStatus(request.id, 'Rejected');
          load();
        },
      },
    ]);
  };

  const suggestedShelters = useMemo(() => {
    if (!assignTarget) return [];
    const inDistrict = shelters.filter((s) => !assignTarget.district || s.district.toLowerCase() === assignTarget.district.toLowerCase());
    return (inDistrict.length > 0 ? inDistrict : shelters).filter((s) => s.status !== 'Closed');
  }, [assignTarget, shelters]);

  const handleAssign = async (shelter: Shelter) => {
    if (!assignTarget) return;
    await assignShelterToRequest(assignTarget.id, shelter.id, shelter.name);
    setAssignTarget(null);
    load();
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · SHELTERS" title="Citizen Shelter Requests" scrollY={scrollY} onBack={() => router.back()} />

      <View style={styles.filterRow}>
        {(['Pending', 'Assigned', 'Rejected', 'All'] as Filter[]).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No requests in this category.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{item.userName || 'Resident'}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={styles.cardDate}>{formatDate(item)}</Text>
              <Text style={styles.cardMeta}><Ionicons name="location-outline" size={12} /> {item.address}</Text>
              <Text style={styles.cardMeta}><Ionicons name="people-outline" size={12} /> {item.peopleCount} people{item.district ? ` · ${item.district}` : ''}</Text>
              {item.contactNumber ? <Text style={styles.cardMeta}><Ionicons name="call-outline" size={12} /> {item.contactNumber}</Text> : null}
              <Text style={styles.cardDescription}>{item.description}</Text>
              {item.shelterName ? (
                <View style={styles.assignedBox}>
                  <Ionicons name="home" size={14} color={Colors.primary} />
                  <Text style={styles.assignedText}>Assigned to {item.shelterName}</Text>
                </View>
              ) : null}

              {item.status === 'Pending' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignTarget(item)}>
                    <Text style={styles.assignBtnText}>Assign Shelter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={!!assignTarget} transparent animationType="fade" onRequestClose={() => setAssignTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setAssignTarget(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Assign a Shelter</Text>
            <Text style={styles.sheetSubtitle}>
              {suggestedShelters.length > 0 && assignTarget?.district ? `Showing shelters in ${assignTarget.district}` : 'Showing all shelters'}
            </Text>
            <FlatList
              data={suggestedShelters}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No shelters available to assign.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.shelterOption} onPress={() => handleAssign(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shelterOptionName}>{item.name}</Text>
                    <Text style={styles.shelterOptionMeta}>{item.currentOccupancy}/{item.capacity} occupied</Text>
                  </View>
                  <StatusPill status={item.status} />
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <DMCTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  filterChipActive: { backgroundColor: '#0B7A66', borderColor: '#0B7A66' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textMedium },
  filterChipTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: 30 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEF3F1' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  cardDate: { fontSize: 11, color: Colors.textMuted, marginBottom: 6 },
  cardMeta: { fontSize: 12, color: Colors.textMedium, marginBottom: 2 },
  cardDescription: { fontSize: 12, color: Colors.textMedium, marginTop: 6, lineHeight: 17, fontStyle: 'italic' },
  assignedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#E8F5F2', borderRadius: 10, padding: 8 },
  assignedText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  assignBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  assignBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  rejectBtn: { flex: 1, backgroundColor: '#FCE8E8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  sheetSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  shelterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F5F4', gap: 10 },
  shelterOptionName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  shelterOptionMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
