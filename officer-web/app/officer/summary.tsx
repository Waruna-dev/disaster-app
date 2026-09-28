import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useOfficerData } from '../../hooks/useOfficerData';
import { logActivity } from '../../services/activityService';
import { Badge, Btn, Card, Col, EmptyState, PageHeader, Row, Spinner, fmtDateTime, useUI } from '../../components/officer/ui';
import { O } from '../../components/officer/theme';

const ICON: Record<string, any> = { shelter: 'business', rescue: 'people', resource: 'cube', alert: 'warning', notification: 'paper-plane' };

/** "Information Updated" overview: latest shelter / team / resource updates plus the full activity timeline. */
export default function Summary() {
  const { user } = useAuth();
  const { toast } = useUI();
  const d = useOfficerData();
  if (d.loading) return <Spinner />;
  const last = (t: string) => d.activities.find((a) => a.type === t);
  const rows = [['shelter', 'Shelter'], ['rescue', 'Rescue Team'], ['resource', 'Relief Resources']] as const;

  const notify = async () => {
    await logActivity({ type: 'notification', title: 'Notifications sent', detail: 'Relevant parties notified of latest updates', status: 'Success', createdBy: user?.uid });
    toast('Notification recorded in the activity log.'); d.refresh();
  };

  return (
    <View>
      <PageHeader title="Information Updated" subtitle="Summary of the latest shelter, rescue team and relief resource updates." />
      <View style={s.check}><Ionicons name="checkmark" size={48} color="#fff" /></View>
      <Row>
        <Col flex={1.4}>
          <Card title="Summary of Updates">
            {rows.map(([t, label]) => { const a = last(t); return (
              <View key={t} style={s.row}>
                <View style={s.ic}><Ionicons name={ICON[t]} size={22} color={O.primary} /></View>
                <Text style={s.label}>{label}</Text>
                <View style={{ flex: 1 }}>{a ? (<><Text style={s.val}>{a.title}</Text><Text style={s.sub}>{a.detail}</Text></>) : <Text style={s.sub}>No updates yet</Text>}</View>
              </View>); })}
            <View style={s.row}><View style={s.ic}><Ionicons name="time" size={22} color={O.primary} /></View><Text style={s.label}>Updated At</Text>
              <View style={{ flex: 1 }}><Text style={s.val}>{fmtDateTime(d.activities[0]?.createdAt)}</Text><Text style={s.sub}>By: District Officer</Text></View></View>
          </Card>
        </Col>
        <Col flex={1}>
          <Card title="Recent Activities">
            {d.activities.length === 0 ? <EmptyState text="No activity yet." /> : d.activities.slice(0, 8).map((a) => (
              <View key={a.id} style={s.tl}><View style={s.dot} /><View style={{ flex: 1 }}><Text style={s.val}>{a.title}</Text><Text style={s.sub}>{fmtDateTime(a.createdAt)} · {a.detail}</Text></View><Badge text={a.status} /></View>))}
          </Card>
        </Col>
      </Row>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 30 }}>
        <Btn label="View Updated Information" icon="document-text-outline" variant="secondary" onPress={() => router.push('/officer/reports' as any)} />
        <Btn label="Send Notifications" icon="paper-plane" onPress={notify} />
        <Btn label="Back to Dashboard" icon="arrow-back" variant="secondary" onPress={() => router.push('/officer/dashboard' as any)} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  check: { width: 84, height: 84, borderRadius: 42, backgroundColor: O.success, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F5F3' },
  ic: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F3EE', alignItems: 'center', justifyContent: 'center' },
  label: { width: 130, fontSize: 13, fontWeight: '800', color: O.text }, val: { fontSize: 13, fontWeight: '700', color: O.text }, sub: { fontSize: 12, color: O.textMuted, marginTop: 2 },
  tl: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: O.primary },
});
