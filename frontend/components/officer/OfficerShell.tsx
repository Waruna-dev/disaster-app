import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authService';
import { O } from './theme';
import { useBreakpoint, useUI } from './ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const NAV: { label: string; icon: IconName; href: string; match: string[] }[] = [
  { label: 'Dashboard', icon: 'home', href: '/officer/dashboard', match: ['/officer/dashboard', '/officer/summary'] },
  { label: 'Hazard Alerts', icon: 'warning', href: '/officer/hazard-alerts', match: ['/officer/hazard-alerts'] },
  { label: 'Shelters', icon: 'business', href: '/officer/shelters', match: ['/officer/shelters', '/officer/shelter-form', '/officer/shelter-requests'] },
  { label: 'Rescue Teams', icon: 'people', href: '/officer/rescue-teams', match: ['/officer/rescue-teams', '/officer/rescue-requests'] },
  { label: 'Resources', icon: 'cube', href: '/officer/resources', match: ['/officer/resources'] },
  { label: 'Reports', icon: 'bar-chart', href: '/officer/reports', match: ['/officer/reports'] },
  { label: 'Settings', icon: 'settings', href: '/officer/settings', match: ['/officer/settings'] },
];

export function OfficerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, user } = useAuth();
  const { isMobile } = useBreakpoint();
  const { confirm } = useUI();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null);
  const [pending, setPending] = useState({ shelter: 0, rescue: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([
          getCountFromServer(query(collection(db, 'shelterRequests'), where('status', '==', 'Pending'))),
          getCountFromServer(query(collection(db, 'rescueRequests'), where('status', '==', 'Pending'))),
        ]);
        setPending({ shelter: a.data().count, rescue: b.data().count });
      } catch {}
    })();
    setDrawer(false);
    setMenu(null);
  }, [pathname]);

  const total = pending.shelter + pending.rescue;
  const name = (userProfile as any)?.fullName || user?.email?.split('@')[0] || 'District Officer';

  const go = (href: string) => { setMenu(null); setDrawer(false); router.push(href as any); };
  const signOut = async () => {
    setMenu(null);
    if (await confirm({ title: 'Sign out', message: 'Do you want to sign out of the District Officer portal?', confirmLabel: 'Sign out' })) {
      await logoutUser();
      router.replace('/officer/login' as any);
    }
  };

  const Sidebar = (
    <View style={s.sidebar}>
      <View style={s.brand}>
        <View style={s.brandIcon}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.brandTitle}>Smart Disaster</Text>
          <Text style={s.brandSub}>District Officer Portal</Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
        {NAV.map((n) => {
          const active = n.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
          const badge = n.label === 'Shelters' ? pending.shelter : n.label === 'Rescue Teams' ? pending.rescue : 0;
          return (
            <TouchableOpacity key={n.label} style={[s.navItem, active && s.navActive]} onPress={() => go(n.href)} activeOpacity={0.8}>
              {active && <View style={s.navBar} />}
              <Ionicons name={n.icon} size={19} color={active ? '#fff' : 'rgba(255,255,255,0.65)'} />
              <Text style={[s.navText, active && { color: '#fff', fontWeight: '800' }]}>{n.label}</Text>
              {badge > 0 && <View style={s.navBadge}><Text style={s.navBadgeText}>{badge}</Text></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.75)" />
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>
      {!isMobile && Sidebar}
      {isMobile && drawer && (
        <Pressable style={s.drawerOverlay} onPress={() => setDrawer(false)}>
          <Pressable onPress={() => {}} style={{ height: '100%' }}>{Sidebar}</Pressable>
        </Pressable>
      )}

      <View style={s.main}>
        <View style={s.topbar}>
          {isMobile && (
            <TouchableOpacity onPress={() => setDrawer(true)} style={{ marginRight: 12 }}>
              <Ionicons name="menu" size={26} color={O.text} />
            </TouchableOpacity>
          )}
          <Text style={s.topTitle} numberOfLines={1}>Smart Disaster Early-Warning System</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.bell} onPress={() => setMenu(menu === 'bell' ? null : 'bell')}>
            <Ionicons name="notifications-outline" size={22} color={O.text} />
            {total > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{total > 9 ? '9+' : total}</Text></View>}
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.user} onPress={() => setMenu(menu === 'user' ? null : 'user')}>
            <View style={s.avatar}><Ionicons name="person" size={18} color="#fff" /></View>
            {!isMobile && <Text style={s.userName} numberOfLines={1}>{name}</Text>}
            <Ionicons name="chevron-down" size={14} color={O.textMuted} />
          </TouchableOpacity>
        </View>

        {menu === 'bell' && (
          <View style={[s.dropdown, { right: isMobile ? 56 : 190 }]}>
            <Text style={s.ddTitle}>Notifications</Text>
            {total === 0 ? <Text style={s.ddEmpty}>You're all caught up.</Text> : (
              <>
                {pending.shelter > 0 && <TouchableOpacity style={s.ddItem} onPress={() => go('/officer/shelter-requests')}><Ionicons name="business" size={16} color={O.primary} /><Text style={s.ddText}>{pending.shelter} pending shelter request(s)</Text></TouchableOpacity>}
                {pending.rescue > 0 && <TouchableOpacity style={s.ddItem} onPress={() => go('/officer/rescue-requests')}><Ionicons name="people" size={16} color={O.primary} /><Text style={s.ddText}>{pending.rescue} pending rescue request(s)</Text></TouchableOpacity>}
              </>
            )}
          </View>
        )}
        {menu === 'user' && (
          <View style={[s.dropdown, { right: 16, width: 200 }]}>
            <Text style={s.ddTitle}>{name}</Text>
            <Text style={s.ddEmpty}>{user?.email}</Text>
            <TouchableOpacity style={s.ddItem} onPress={() => go('/officer/settings')}><Ionicons name="settings-outline" size={16} color={O.textMid} /><Text style={s.ddText}>Settings</Text></TouchableOpacity>
            <TouchableOpacity style={s.ddItem} onPress={signOut}><Ionicons name="log-out-outline" size={16} color={O.danger} /><Text style={[s.ddText, { color: O.danger }]}>Sign out</Text></TouchableOpacity>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, isMobile && { padding: 16 }]} onScrollBeginDrag={() => setMenu(null)}>
          <View style={s.contentInner}>{children}</View>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: O.bg, height: '100%' as any },
  sidebar: { width: O.sidebarWidth, backgroundColor: O.sidebar, height: '100%' as any },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  brandIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: O.primary, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  brandSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 22, marginHorizontal: 10, marginVertical: 2, borderRadius: 10 },
  navActive: { backgroundColor: O.sidebarActive },
  navBar: { position: 'absolute', left: -10, top: 8, bottom: 8, width: 4, borderRadius: 2, backgroundColor: '#5FD3B0' },
  navText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', flex: 1 },
  navBadge: { backgroundColor: '#F9A825', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  navBadgeText: { fontSize: 10, fontWeight: '800', color: '#3b2a00' },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  signOutText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100 },
  main: { flex: 1, minWidth: 0 },
  topbar: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: O.border, zIndex: 20 },
  topTitle: { fontSize: 16, fontWeight: '800', color: O.text, flexShrink: 1 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 4, right: 2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: O.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  divider: { width: 1, height: 28, backgroundColor: O.border, marginHorizontal: 12 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 200 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: O.primary, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 14, fontWeight: '700', color: O.text, flexShrink: 1 },
  dropdown: { position: 'absolute', top: 60, width: 290, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: O.border, padding: 14, zIndex: 50, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  ddTitle: { fontSize: 13, fontWeight: '800', color: O.text, marginBottom: 6 },
  ddEmpty: { fontSize: 12, color: O.textMuted, marginBottom: 6 },
  ddItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  ddText: { fontSize: 13, color: O.textMid, fontWeight: '600', flexShrink: 1 },
  content: { padding: 28 },
  contentInner: { width: '100%', maxWidth: 1400, alignSelf: 'center' },
});
