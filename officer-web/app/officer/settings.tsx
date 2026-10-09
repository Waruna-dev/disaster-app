import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { logoutUser, updateUserPassword } from '../../services/authService';
import { seedDemoData } from '../../services/seedService';
import { Badge, Btn, Card, Col, Field, Input, KV, PageHeader, Row, useUI } from '../../components/officer/ui';
import { O } from '../../components/officer/theme';

export default function Settings() {
  const { user, userProfile } = useAuth();
  const { toast, confirm } = useUI();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [seeding, setSeeding] = useState(false);
  const p: any = userProfile;

  const changePw = async () => {
    if (pw.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    if (pw !== pw2) { toast('Passwords do not match.', 'error'); return; }
    try { setBusy(true); await updateUserPassword(pw); setPw(''); setPw2(''); toast('Password updated.'); }
    catch (e: any) { toast(e?.code === 'auth/requires-recent-login' ? 'Please sign out and sign in again, then retry.' : (e?.message || 'Could not update password'), 'error'); }
    finally { setBusy(false); }
  };
  const seed = async () => {
    if (!(await confirm({ title: 'Load demo data', message: 'This adds 6 shelters, 5 rescue teams, 5 resources and 3 hazard alerts to your database. Use it only on a test project.', confirmLabel: 'Load demo data' }))) return;
    try { setSeeding(true); const n = await seedDemoData(user!.uid); toast(`Added ${n} demo records.`); }
    catch (e: any) {
      const message = e?.code === 'permission-denied'
        ? 'Permission denied. Deploy firestore.rules and ensure this account has users/{uid}.role = admin.'
        : (e?.message || 'Could not load demo data');
      toast(message, 'error');
    } finally { setSeeding(false); }
  };

  return (
    <View>
      <PageHeader title="Settings" subtitle="Manage your officer account and portal data." />
      <Row>
        <Col>
          <Card title="Profile">
            <KV label="Name">{p?.fullName || '—'}</KV><KV label="Email">{user?.email || '—'}</KV>
            <KV label="Contact">{p?.contactNumber || '—'}</KV><KV label="Role"><Badge text="District Officer" tone="primary" /></KV>
            <Btn label="Sign out" icon="log-out-outline" variant="secondary" style={{ marginTop: 16, alignSelf: 'flex-start' }}
              onPress={async () => { await logoutUser(); router.replace('/officer/login' as any); }} />
          </Card>
          <Card title="Change Password">
            <Field label="New password"><Input value={pw} onChangeText={setPw} secureTextEntry placeholder="At least 6 characters" /></Field>
            <Field label="Confirm password"><Input value={pw2} onChangeText={setPw2} secureTextEntry placeholder="Re-enter password" /></Field>
            <Btn label="Update Password" icon="key-outline" loading={busy} onPress={changePw} style={{ alignSelf: 'flex-start' }} />
          </Card>
        </Col>
        <Col>
          <Card title="Demo Data" subtitle="Quickly fill an empty database for testing and presentations.">
            <Text style={s.t}>Creates sample Sri Lankan shelters, rescue teams, relief resources and hazard alerts so every screen has content.</Text>
            <Btn label="Load Demo Data" icon="cloud-upload-outline" loading={seeding} onPress={seed} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
          </Card>
          <Card title="About"><Text style={s.t}>Smart Disaster Early-Warning System — District Officer Portal (web). Citizens use the mobile app; both share the same Firebase project.</Text></Card>
        </Col>
      </Row>
    </View>
  );
}
const s = StyleSheet.create({ t: { fontSize: 13, color: O.textMid, lineHeight: 20 } });
