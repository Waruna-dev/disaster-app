import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { fetchUserShelterRequests } from '../../services/shelterRequestService';
import { fetchUserRescueRequests } from '../../services/rescueRequestService';
import { StatusPill } from '../../components/StatusPill';

type Item = { id: string; kind: 'shelter' | 'rescue'; title: string; subtitle: string; status: string; when: number; note?: string | null };

/** Citizen dashboard: every shelter + rescue request the user made, with live status. */
export default function MyRequestsDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'In progress' | 'Completed'>('All');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, r] = await Promise.all([fetchUserShelterRequests(user.uid), fetchUserRescueRequests(user.uid)]);
      const list: Item[] = [
        ...s.map((x) => ({ id: x.id, kind: 'shelter' as const, title: x.shelterName || 'Shelter request', subtitle: `${x.peopleCount} people · ${x.address}`, status: x.status, when: x.createdAt?.toMillis() ?? 0, note: x.officerNotes })),
        ...r.map((x) => ({ id: x.id, kind: 'rescue' as const, title: x.teamName || x.requestedType, subtitle: `${x.peopleCount} people · ${x.address}`, status: x.status, when: x.createdAt?.toMillis() ?? 0, note: x.officerNotes })),
      ].sort((a, b) => b.when - a.when);
      setItems(list);
    } finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const group = (st: string) => (st === 'Pending' ? 'Pending' : ['Completed', 'Rejected'].includes(st) ? 'Completed' : 'In progress');
  const counts = useMemo(() => ({
    Pending: items.filter((i) => group(i.status) === 'Pending').length,
    'In progress': items.filter((i) => group(i.status) === 'In progress').length,
    Completed: items.filter((i) => group(i.status) === 'Completed').length,
  }), [items]);
  const shown = filter === 'All' ? items : items.filter((i) => group(i.status) === filter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={Colors.textDark} /></TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.summary}>
        {(['Pending', 'In progress', 'Completed'] as const).map((k) => (
          <View key={k} style={styles.sumBox}><Text style={styles.sumValue}>{counts[k]}</Text><Text style={styles.sumLabel}>{k}</Text></View>
        ))}
      </View>

      <View style={styles.chips}>
        {(['All', 'Pending', 'In progress', 'Completed'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipOn]} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, filter === f && { color: Colors.white }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {shown.length === 0 ? <Text style={styles.empty}>No requests here yet.</Text> : shown.map((i) => (
            <TouchableOpacity key={i.kind + i.id} style={styles.card} activeOpacity={0.8}
              onPress={() => router.push((i.kind === 'shelter' ? '/(user)/shelters/my-requests' : '/(user)/rescue-teams/my-requests') as any)}>
              <View style={styles.iconWrap}><Ionicons name={i.kind === 'shelter' ? 'home' : 'people'} size={20} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{i.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>{i.subtitle}</Text>
                {i.note ? <Text style={styles.note} numberOfLines={2}>Officer: {i.note}</Text> : null}
              </View>
              <StatusPill status={i.status} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  summary: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  sumBox: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EEF3F1' },
  sumValue: { fontSize: 22, fontWeight: '800', color: Colors.primary }, sumLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  chipOn: { backgroundColor: '#0B7A66', borderColor: '#0B7A66' }, chipText: { fontSize: 11, fontWeight: '600', color: Colors.textMedium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEF3F1' },
  iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textDark }, sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  note: { fontSize: 11, color: Colors.textMedium, marginTop: 4, fontStyle: 'italic' },
});
