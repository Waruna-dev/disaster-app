import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { RescueRequest } from '../../../types/rescueTeam';
import { fetchUserRescueRequests } from '../../../services/rescueRequestService';
import { StatusPill } from '../../../components/StatusPill';

const STEPS = ['Pending', 'Assigned', 'On the way', 'Pickup', 'Completed'];

function formatDate(request: RescueRequest) {
  const date = request.createdAt?.toDate?.();
  if (!date) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ProgressTracker({ status }: { status: string }) {
  const current = STEPS.indexOf(status);
  return (
    <View style={styles.tracker}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <View key={step} style={styles.stepWrap}>
            <View style={styles.stepLineRow}>
              <View style={[styles.line, i === 0 && { backgroundColor: 'transparent' }, done && i > 0 && styles.lineDone]} />
              <View style={[styles.dot, done && styles.dotDone]}>
                {done && <Ionicons name="checkmark" size={9} color={Colors.white} />}
              </View>
              <View style={[styles.line, i === STEPS.length - 1 && { backgroundColor: 'transparent' }, i < current && styles.lineDone]} />
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone]} numberOfLines={1}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MyRescueRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setRequests(await fetchUserRescueRequests(user.uid));
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
        <Text style={styles.headerTitle}>My Rescue Requests</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={40} color={Colors.placeholder} />
          <Text style={styles.emptyText}>You haven't requested a rescue team yet.</Text>
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
              <View style={styles.requestHeading}>
                <View style={styles.requestIcon}>
                  <Ionicons name="people" size={25} color={Colors.primary} />
                </View>
                <View style={styles.requestHeadingCopy}>
                  <Text style={styles.requestEyebrow}>Rescue team request</Text>
                  <Text style={styles.cardTitle}>{item.requestedType}</Text>
                </View>
              </View>
              {item.teamName ? (
                <View style={styles.teamPanel}>
                  <View style={styles.teamIcon}>
                    <Ionicons name="people" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.teamCopy}>
                    <Text style={styles.teamLabel}>Assigned rescue team</Text>
                    <Text style={styles.teamName} numberOfLines={2}>{item.teamName}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={19} color={Colors.primary} />
                </View>
              ) : (
                <View style={styles.teamPanelPending}>
                  <View style={styles.teamIconPending}>
                    <Ionicons name="time-outline" size={18} color={Colors.warning} />
                  </View>
                  <View style={styles.teamCopy}>
                    <Text style={styles.teamLabelPending}>Awaiting team assignment</Text>
                    <Text style={styles.teamPendingText}>A district officer is reviewing your request.</Text>
                  </View>
                </View>
              )}
              <Text style={styles.cardMeta} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {item.address}
              </Text>
              <Text style={styles.cardMeta}>
                <Ionicons name="people-outline" size={12} color={Colors.textMuted} /> {item.peopleCount} people ·{' '}
                <Ionicons name="call-outline" size={12} color={Colors.textMuted} /> {item.contactNumber}
              </Text>
              {item.status !== 'Rejected' ? (
                <ProgressTracker status={item.status} />
              ) : null}
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
  requestHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requestIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center' },
  requestHeadingCopy: { flex: 1 },
  requestEyebrow: { fontSize: 10, color: Colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  teamPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5F2', borderRadius: 12, padding: 10, marginBottom: 10 },
  teamIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  teamCopy: { flex: 1 },
  teamLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  teamName: { fontSize: 13, color: Colors.textDark, fontWeight: '800', marginTop: 2 },
  teamPanelPending: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF6E5', borderRadius: 12, padding: 10, marginBottom: 10 },
  teamIconPending: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  teamLabelPending: { fontSize: 12, color: '#9A6500', fontWeight: '800' },
  teamPendingText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  tracker: { flexDirection: 'row', marginTop: 14 },
  stepWrap: { flex: 1, alignItems: 'center' },
  stepLineRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  line: { flex: 1, height: 2, backgroundColor: '#DDE6E3' },
  lineDone: { backgroundColor: Colors.primary },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#DDE6E3', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Colors.primary },
  stepLabel: { fontSize: 8, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  stepLabelDone: { color: Colors.primary, fontWeight: '700' },
  notesBox: { marginTop: 10, backgroundColor: Colors.inputSoftBg, borderRadius: 10, padding: 10 },
  notesLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  notesText: { fontSize: 12, color: Colors.textDark },
});
