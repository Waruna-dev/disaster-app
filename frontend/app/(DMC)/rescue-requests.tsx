import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, Pressable, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatusPill } from '../../components/StatusPill';
import { RescueRequest, RescueRequestStatus, RescueTeam } from '../../types/rescueTeam';
import { fetchAllRescueRequests, assignTeamToRequest, updateRescueRequestStatus } from '../../services/rescueRequestService';
import { fetchAllRescueTeams, updateRescueTeam } from '../../services/rescueTeamService';

type Filter = 'Pending' | 'Active' | 'Completed' | 'All';

const NEXT_STATUS: Partial<Record<RescueRequestStatus, RescueRequestStatus>> = {
  Assigned: 'On the way',
  'On the way': 'Pickup',
  Pickup: 'Completed',
};

function formatDate(r: RescueRequest) {
  const d = r.createdAt?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RescueRequestsScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('Pending');
  const [assignTarget, setAssignTarget] = useState<RescueRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([fetchAllRescueRequests(), fetchAllRescueTeams()]);
      setRequests(r);
      setTeams(t);
    } catch {
      Alert.alert('Error', 'Could not load rescue requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Pending': return requests.filter((r) => r.status === 'Pending');
      case 'Active': return requests.filter((r) => ['Assigned', 'On the way', 'Pickup'].includes(r.status));
      case 'Completed': return requests.filter((r) => r.status === 'Completed' || r.status === 'Rejected');
      default: return requests;
    }
  }, [requests, filter]);

  const candidateTeams = useMemo(() => {
    if (!assignTarget?.district) return [];
    return teams
      .filter((t) => t.status === 'Available'
        && t.district === assignTarget.district
        && t.type === assignTarget.requestedType)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignTarget, teams]);

  const handleAssign = async (team: RescueTeam) => {
    if (!assignTarget) return;
    await assignTeamToRequest(assignTarget.id, team.id, team.name);
    await updateRescueTeam(team.id, { status: 'On Mission' });
    setAssignTarget(null);
    load();
  };

  const handleAdvance = async (r: RescueRequest) => {
    const next = NEXT_STATUS[r.status];
    if (!next) return;
    await updateRescueRequestStatus(r.id, next);
    // Free the team up again once the mission is finished.
    if (next === 'Completed' && r.teamId) await updateRescueTeam(r.teamId, { status: 'Available' });
    load();
  };

  const handleReject = (r: RescueRequest) => {
    Alert.alert('Reject Request', 'Reject this rescue request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => { await updateRescueRequestStatus(r.id, 'Rejected'); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · RESCUE TEAMS" title="Citizen Rescue Requests" scrollY={scrollY} onBack={() => router.back()} />

      <View style={styles.filterRow}>
        {(['Pending', 'Active', 'Completed', 'All'] as Filter[]).map((f) => (
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
          keyExtractor={(i) => i.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No requests in this category.</Text>}
          renderItem={({ item }) => {
            const next = NEXT_STATUS[item.status];
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{item.userName || 'Resident'}</Text>
                  <StatusPill status={item.status} />
                </View>
                <Text style={styles.cardDate}>{formatDate(item)}</Text>
                <Text style={styles.cardMeta}><Ionicons name="shield-outline" size={12} /> {item.requestedType}</Text>
                <Text style={styles.cardMeta}><Ionicons name="location-outline" size={12} /> {item.address}</Text>
                <Text style={styles.cardMeta}><Ionicons name="people-outline" size={12} /> {item.peopleCount} people · <Ionicons name="call-outline" size={12} /> {item.contactNumber}</Text>
                {item.teamName ? (
                  <View style={styles.assignedBox}>
                    <Ionicons name="people" size={14} color={Colors.primary} />
                    <Text style={styles.assignedText}>{item.teamName}</Text>
                  </View>
                ) : null}

                {item.status === 'Pending' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setAssignTarget(item)}>
                      <Text style={styles.primaryBtnText}>Assign Team</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {next && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAdvance(item)}>
                      <Text style={styles.primaryBtnText}>Mark as “{next}”</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={!!assignTarget} transparent animationType="fade" onRequestClose={() => setAssignTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setAssignTarget(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Assign a Rescue Team</Text>
            <Text style={styles.sheetSubtitle}>Available {assignTarget?.requestedType} teams in {assignTarget?.district || 'the citizen district'}</Text>
            <FlatList
              data={candidateTeams}
              keyExtractor={(t) => t.id}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No available teams right now.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.teamOption} onPress={() => handleAssign(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName}>{item.name}</Text>
                    <Text style={styles.teamMeta}>{item.type} · {item.district} · {item.members} members</Text>
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
  assignedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#E8F5F2', borderRadius: 10, padding: 8 },
  assignedText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  rejectBtn: { flex: 1, backgroundColor: '#FCE8E8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  sheetSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  teamOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F5F4', gap: 10 },
  teamName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  teamMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
