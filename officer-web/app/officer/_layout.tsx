import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authService';
import { OfficerShell } from '../../components/officer/OfficerShell';
import { UIProvider, Btn } from '../../components/officer/ui';
import { O } from '../../components/officer/theme';

export const isOfficer = (profile: any) => profile?.role === 'admin';

/** Guards every /officer/* page: must be signed in AND have role "admin". */
export default function OfficerLayout() {
  const { user, userProfile, isLoading } = useAuth();
  const pathname = usePathname();
  const isLogin = pathname.endsWith('/login');
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && !isLogin) router.replace('/officer/login' as any);
  }, [isLoading, user, isLogin]);

  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (isLogin) return <UIProvider><Slot /></UIProvider>;

  if (isLoading || !user || (!userProfile && !waited)) {
    return <View style={s.center}><ActivityIndicator size="large" color={O.primary} /></View>;
  }

  if (!isOfficer(userProfile)) {
    return (
      <View style={s.center}>
        <View style={s.denied}>
          <Ionicons name="lock-closed" size={40} color={O.danger} />
          <Text style={s.deniedTitle}>Access restricted</Text>
          <Text style={s.deniedText}>This portal is for District Officers only. Your account does not have the "admin" role.</Text>
          <Btn label="Sign out" variant="secondary" onPress={async () => { await logoutUser(); router.replace('/officer/login' as any); }} />
        </View>
      </View>
    );
  }

  return (
    <UIProvider>
      <OfficerShell><Slot /></OfficerShell>
    </UIProvider>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: O.bg, padding: 24 },
  denied: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, maxWidth: 420, borderWidth: 1, borderColor: O.border },
  deniedTitle: { fontSize: 20, fontWeight: '800', color: O.text },
  deniedText: { fontSize: 14, color: O.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
