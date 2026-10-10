import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../../../../constants/colors';
import { useAuth } from '../../../../context/AuthContext';
import { RescueTeam, RESCUE_TEAM_TYPES, RescueTeamType } from '../../../../types/rescueTeam';
import { fetchRescueTeamById } from '../../../../services/rescueTeamService';
import { createRescueRequest } from '../../../../services/rescueRequestService';
import { FormInput } from '../../../../components/FormInput';
import { SelectField } from '../../../../components/SelectField';
import { PrimaryButton } from '../../../../components/PrimaryButton';

const PEOPLE_OPTIONS = ['1', '2', '3', '4', '5', '6-10', '11-20', '20+'];

function peopleToNumber(v: string): number {
  if (v === '6-10') return 10;
  if (v === '11-20') return 20;
  if (v === '20+') return 25;
  return parseInt(v, 10) || 1;
}

export default function RescueRequestFormScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { id, lat, lng, address } = useLocalSearchParams<{ id: string; lat?: string; lng?: string; address?: string }>();

  const [team, setTeam] = useState<RescueTeam | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Fetching your location…');
  const [teamType, setTeamType] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [people, setPeople] = useState<string | null>('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const t = await fetchRescueTeamById(id);
        setTeam(t);
        if (t) setTeamType((prev) => prev ?? t.type);
      } finally {
        setLoadingTeam(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (lat && lng) {
      setCoords({ latitude: Number(lat), longitude: Number(lng) });
      setLocationLabel(address || 'Selected location');
    }
  }, [lat, lng, address]);

  useEffect(() => {
    if (coords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLabel('Location unavailable — tap to select on map');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCoords(c);
        const geocode = await Location.reverseGeocodeAsync(c);
        const place = geocode?.[0];
        const label = [place?.name, place?.street, place?.district || place?.city].filter(Boolean).join(', ');
        setLocationLabel(label || 'Current location');
      } catch {
        setLocationLabel('Location unavailable — tap to select on map');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please log in to request a rescue team.');
      return;
    }
    if (!coords) {
      Alert.alert('Location required', 'Please select your location on the map.');
      return;
    }
    if (!teamType) {
      Alert.alert('Team type required', 'Please choose the type of support you need.');
      return;
    }
    if (!/^\+?[0-9\s-]{9,15}$/.test(contactNumber.trim())) {
      Alert.alert('Invalid contact number', 'Please enter a valid phone number.');
      return;
    }

    try {
      setSubmitting(true);
      await createRescueRequest({
        userId: user.uid,
        userName: userProfile?.fullName,
        contactNumber: contactNumber.trim(),
        requestedType: teamType as RescueTeamType,
        peopleCount: peopleToNumber(people || '1'),
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: locationLabel,
        district: team?.district,
      });
      Alert.alert('Request Sent', 'Your rescue request has been sent to the district officer.', [
        { text: 'View My Requests', onPress: () => router.replace('/(user)/rescue-teams/my-requests' as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Rescue Team</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.content} enableOnAndroid extraScrollHeight={20}>
        {loadingTeam ? (
          <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
        ) : team ? (
          <View style={styles.banner}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={styles.bannerText}>Requesting: {team.name}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Location</Text>
        <TouchableOpacity
          style={styles.locationBox}
          onPress={() => router.push({ pathname: '/(user)/pick-location', params: { returnTo: `/(user)/rescue-teams/request/${id}` } } as any)}
        >
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text style={styles.locationText} numberOfLines={2}>{locationLabel}</Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        <SelectField label="Rescue Team Type" value={teamType} options={RESCUE_TEAM_TYPES} onSelect={setTeamType} />

        <FormInput
          label="Contact Number"
          keyboardType="phone-pad"
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="e.g., 0771234567"
        />

        <SelectField label="Number of People" value={people} options={PEOPLE_OPTIONS} onSelect={setPeople} />
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton title="Send Request" loading={submitting} onPress={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  content: { padding: 20, paddingBottom: 40 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5F2', borderRadius: 12, padding: 12, marginBottom: 20 },
  bannerText: { fontSize: 13, fontWeight: '700', color: Colors.primary, flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMedium, marginBottom: 8 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, backgroundColor: Colors.inputBg, padding: 14, marginBottom: 16 },
  locationText: { flex: 1, fontSize: 13, color: Colors.textDark },
  changeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#EEF3F1' },
});
