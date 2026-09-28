import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../services/authService';
import { Btn, Field, Input, useBreakpoint } from '../../components/officer/ui';
import { O } from '../../components/officer/theme';

export default function OfficerLogin() {
  const { user, userProfile } = useAuth();
  const { isMobile } = useBreakpoint();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already signed in as an officer -> straight to the dashboard.
  useEffect(() => {
    if (user && (userProfile as any)?.role === 'admin') router.replace('/officer/dashboard' as any);
  }, [user, userProfile]);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    try {
      setLoading(true);
      const cred: any = await loginUser(email.trim(), password);
      const uid = cred?.user?.uid ?? auth.currentUser?.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      const role = snap.exists() ? (snap.data() as any).role : null;
      if (role !== 'admin') {
        await signOut(auth);
        setError('This account is not authorised for the District Officer portal.');
        return;
      }
      router.replace('/officer/dashboard' as any);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      {!isMobile && (
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="shield-checkmark" size={44} color="#fff" /></View>
          <Text style={s.heroTitle}>Smart Disaster{'\n'}Early-Warning System</Text>
          <Text style={s.heroSub}>Coordinate shelters, rescue teams and relief resources for effective disaster response across Sri Lanka.</Text>
          {[['business', 'Shelter management & occupancy'], ['people', 'Rescue team dispatch'], ['cube', 'Relief resource tracking'], ['bar-chart', 'Live reports & PDF export']].map(([i, t]) => (
            <View key={t} style={s.point}><Ionicons name={i as any} size={18} color="#8FE3C8" /><Text style={s.pointText}>{t}</Text></View>
          ))}
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.formWrap}>
        <View style={s.form}>
          <Text style={s.title}>District Officer Sign in</Text>
          <Text style={s.sub}>Use your officer account to access the portal.</Text>
          <Field label="Email"><Input icon="mail-outline" value={email} onChangeText={setEmail} placeholder="officer@example.com" autoCapitalize="none" keyboardType="email-address" /></Field>
          <Field label="Password"><Input icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry onSubmitEditing={submit} /></Field>
          {error ? <View style={s.error}><Ionicons name="alert-circle" size={16} color={O.danger} /><Text style={s.errorText}>{error}</Text></View> : null}
          <Btn label="Sign in" icon="log-in-outline" onPress={submit} loading={loading} style={{ marginTop: 6, height: 48 }} />
          <Text style={s.note}>Citizens should use the mobile app. This portal is for authorised officers only.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  hero: { flex: 1, backgroundColor: O.sidebar, padding: 56, justifyContent: 'center', maxWidth: 560 },
  heroIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: O.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 42, marginBottom: 16 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 23, marginBottom: 32 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pointText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  formWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  form: { width: '100%', maxWidth: 400 },
  title: { fontSize: 28, fontWeight: '800', color: O.text },
  sub: { fontSize: 14, color: O.textMuted, marginTop: 6, marginBottom: 28 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: O.dangerBg, padding: 12, borderRadius: 10, marginBottom: 12 },
  errorText: { color: O.danger, fontSize: 13, fontWeight: '600', flex: 1 },
  note: { fontSize: 12, color: O.textMuted, textAlign: 'center', marginTop: 22, lineHeight: 18 },
});
