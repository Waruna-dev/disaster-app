import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { StatusPill } from '../../components/StatusPill';
import { SelectField } from '../../components/SelectField';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { RescueTeam, RescueTeamStatus, RESCUE_TEAM_TYPES, RescueTeamType } from '../../types/rescueTeam';
import { fetchAllRescueTeams, createRescueTeam, updateRescueTeam, deleteRescueTeam } from '../../services/rescueTeamService';

const STATUSES: RescueTeamStatus[] = ['Available', 'On Mission', 'Unavailable'];

export default function DmcRescueTeamsScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RescueTeam | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [members, setMembers] = useState('');
  const [equipment, setEquipment] = useState('');
  const [status, setStatus] = useState<string | null>('Available');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeams(await fetchAllRescueTeams());
    } catch {
      Alert.alert('Error', 'Could not load rescue teams.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(
    () =>
      teams.filter((t) => {
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        if (search.trim() && !`${t.name} ${t.type} ${t.district}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
      }),
    [teams, search, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: teams.length,
      available: teams.filter((t) => t.status === 'Available').length,
      onMission: teams.filter((t) => t.status === 'On Mission').length,
      members: teams.reduce((s, t) => s + t.members, 0),
    }),
    [teams]
  );

  const openForm = (team?: RescueTeam) => {
    setEditing(team ?? null);
    setName(team?.name ?? '');
    setType(team?.type ?? null);
    setDistrict(team?.district ?? null);
    setMembers(team ? String(team.members) : '');
    setEquipment(team?.equipment ?? '');
    setStatus(team?.status ?? 'Available');
    setFormOpen(true);
  };

  const handleSave = async () => {
    const membersNum = parseInt(members, 10);
    if (!name.trim() || !type || !district || !membersNum || membersNum < 1) {
      Alert.alert('Missing information', 'Please fill in team name, type, district and number of members.');
      return;
    }
    try {
      setSaving(true);
      let coords = editing ? { latitude: editing.latitude, longitude: editing.longitude } : null;
      if (!coords) {
        try {
          const r = await Location.geocodeAsync(`${district}, Sri Lanka`);
          if (r?.[0]) coords = { latitude: r[0].latitude, longitude: r[0].longitude };
        } catch {}
      }
      const payload = {
        name: name.trim(),
        type: type as RescueTeamType,
        district,
        members: membersNum,
        equipment: equipment.trim() || undefined,
        status: status as RescueTeamStatus,
        latitude: coords?.latitude ?? 7.8731,
        longitude: coords?.longitude ?? 80.7718,
        currentLocationLabel: district,
      };
      if (editing) await updateRescueTeam(editing.id, payload);
      else await createRescueTeam(payload);
      setFormOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (team: RescueTeam) => {
    Alert.alert('Remove Team', `Remove "${team.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteRescueTeam(team.id); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · RESCUE TEAMS" title="Manage Rescue Teams" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <StatTile icon="people" value={String(stats.total)} label="Total Teams" tint="#1D6FC4" tintBg="#E3F0FC" compact />
              <StatTile icon="checkmark-circle" value={String(stats.available)} label="Available" tint="#2E7D32" tintBg="#E6F4EA" compact />
              <StatTile icon="navigate" value={String(stats.onMission)} label="On Mission" tint="#B8860B" tintBg="#FFF4DC" compact />
              <StatTile icon="person" value={String(stats.members)} label="Members" tint={Colors.primary} tintBg="#E8F5F2" compact />
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>Add Rescue Team</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.requestsLink} onPress={() => router.push('/(DMC)/rescue-requests' as any)}>
              <Ionicons name="mail-open-outline" size={16} color={Colors.primary} />
              <Text style={styles.requestsLinkText}>View Citizen Rescue Requests</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={Colors.placeholder} />
              <TextInput style={styles.searchInput} placeholder="Search team name, type or district..." placeholderTextColor={Colors.placeholder} value={search} onChangeText={setSearch} />
            </View>

            <View style={styles.filterRow}>
              {['All', ...STATUSES].map((f) => (
                <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
                  <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
            {!loading && filtered.length === 0 && <Text style={styles.emptyText}>No rescue teams found.</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>{item.type} · {item.district}</Text>
              <Text style={styles.rowMeta}>{item.members} members{item.equipment ? ` · ${item.equipment}` : ''}</Text>
            </View>
            <StatusPill status={item.status} />
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openForm(item)}>
                <Ionicons name="create-outline" size={18} color={Colors.textMedium} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setFormOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit Rescue Team' : 'Add Rescue Team'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <FormInput label="Team Name *" value={name} onChangeText={setName} placeholder="e.g., Kandy Rescue Team" />
              <SelectField label="Type *" value={type} options={RESCUE_TEAM_TYPES} onSelect={setType} />
              <SelectField label="District *" value={district} options={SRI_LANKA_DISTRICTS} onSelect={setDistrict} />
              <FormInput label="Members *" keyboardType="number-pad" value={members} onChangeText={setMembers} placeholder="e.g., 12" />
              <FormInput label="Equipment" value={equipment} onChangeText={setEquipment} placeholder="e.g., 2 Vehicles, Medical Kit" />
              <SelectField label="Status" value={status} options={STATUSES} onSelect={setStatus} />
              <PrimaryButton title={editing ? 'Save Changes' : 'Save Team'} loading={saving} onPress={handleSave} />
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 14 }} onPress={() => setFormOpen(false)}>
                <Text style={{ fontWeight: '700', color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
  requestsLink: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5F2', borderRadius: 12, padding: 12, marginBottom: 14 },
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
  rowName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  rowMeta: { fontSize: 11, color: Colors.textMuted },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F9F7' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
});
