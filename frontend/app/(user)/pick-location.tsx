import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';
import { UserMapEngine } from '../../components/UserMapEngine';
import { PrimaryButton } from '../../components/PrimaryButton';

/**
 * Full-screen "select location on map" step shared by the shelter and rescue-team
 * request forms. Reuses UserMapEngine's existing report-mode tap-to-select behaviour
 * (used by the incident report flow) so the pin/geocoding UX stays consistent app-wide.
 * On confirm, pushes lat/lng/address params back onto the given `returnTo` route.
 */
export default function PickLocationScreen() {
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo: string }>();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('Loading address...');
  const [isResolving, setIsResolving] = useState(true);

  const handleConfirm = () => {
    if (!coords || !returnTo) return;
    router.push({
      pathname: returnTo as any,
      params: { lat: String(coords.latitude), lng: String(coords.longitude), address },
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.mapWrap}>
        <UserMapEngine
          mode="report"
          onLocationSelect={(c, a, resolving) => {
            setCoords(c);
            setAddress(a);
            setIsResolving(resolving);
          }}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.addressBox}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.addressText} numberOfLines={2}>{isResolving ? 'Finding address…' : address}</Text>
        </View>
        <PrimaryButton title="Confirm Location" disabled={!coords || isResolving} onPress={handleConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8, backgroundColor: Colors.background },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  mapWrap: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 12, backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.inputSoftBg, borderRadius: 12, padding: 12 },
  addressText: { flex: 1, fontSize: 13, color: Colors.textDark },
});
