import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { ShelterRequest } from '../../../types/shelter';
import { fetchUserShelterRequests } from '../../../services/shelterRequestService';
import { StatusPill } from '../../../components/StatusPill';

function formatDate(request: ShelterRequest) {
  const date = request.createdAt?.toDate?.();
  if (!date) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MyShelterRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ShelterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchUserShelterRequests(user.uid);
      setRequests(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Shelter Requests</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={40} color={Colors.placeholder} />
          <Text style={styles.emptyText}>You haven't requested a shelter yet.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardDate}>{formatDate(item)}</Text>
                <StatusPill status={item.status} />
              </View>
              {item.shelterName ? (
                <Text style={styles.cardShelter}>
                  <Ionicons name="home" size={13} color={Colors.primary} /> {item.shelterName}
                </Text>
              ) : (
                <Text style={styles.cardShelterPending}>Awaiting shelter assignment</Text>
              )}
              <Text style={styles.cardMeta} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {item.address}
              </Text>
              <Text style={styles.cardMeta}>
                <Ionicons name="people-outline" size={12} color={Colors.textMuted} /> {item.peopleCount} people
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
              {item.officerNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Officer note</Text>
                  <Text style={styles.notesText}>{item.officerNotes}</Text>
                </View>
              ) : null}
            </View>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  listContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEF3F1' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  cardShelter: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  cardShelterPending: { fontSize: 13, fontWeight: '600', color: Colors.warning, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  cardDescription: { fontSize: 12, color: Colors.textMedium, marginTop: 6, lineHeight: 17 },
  notesBox: { marginTop: 10, backgroundColor: Colors.inputSoftBg, borderRadius: 10, padding: 10 },
  notesLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  notesText: { fontSize: 12, color: Colors.textDark },
});
