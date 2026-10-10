import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Colors } from '../../../../constants/colors';
import { useAuth } from '../../../../context/AuthContext';
import { Shelter } from '../../../../types/shelter';
import { fetchShelterById } from '../../../../services/shelterService';
import { createShelterRequest } from '../../../../services/shelterRequestService';
import { FormInput } from '../../../../components/FormInput';
import { TextAreaInput } from '../../../../components/TextAreaInput';
import { PrimaryButton } from '../../../../components/PrimaryButton';

export default function ShelterRequestFormScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { id, lat, lng, address } = useLocalSearchParams<{ id: string; lat?: string; lng?: string; address?: string }>();

  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loadingShelter, setLoadingShelter] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Fetching your location…');
  const [peopleCount, setPeopleCount] = useState('1');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const s = await fetchShelterById(id);
        setShelter(s);
      } finally {
        setLoadingShelter(false);
      }
    })();
  }, [id]);

  // Params come back from /(user)/pick-location once the user selects a spot on the map.
  useEffect(() => {
    if (lat && lng) {
      setCoords({ latitude: Number(lat), longitude: Number(lng) });
      setLocationLabel(address || 'Selected location');
    }
  }, [lat, lng, address]);

  // Default to the device's current GPS location so the field is never empty.
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
      Alert.alert('Not signed in', 'Please log in to request a shelter.');
      return;
    }
    if (!coords) {
      Alert.alert('Location required', 'Please select your location on the map.');
      return;
    }
    const people = parseInt(peopleCount, 10);
    if (!people || people < 1) {
      Alert.alert('Invalid number of people', 'Please enter how many people need shelter.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description required', 'Please briefly describe your situation.');
      return;
    }

    try {
      setSubmitting(true);
      await createShelterRequest({
        userId: user.uid,
        userName: userProfile?.fullName,
        contactNumber: (userProfile as any)?.contactNumber,
        preferredShelterId: shelter?.id,
        preferredShelterName: shelter?.name,
        affectedArea: locationLabel,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: locationLabel,
        peopleCount: people,
        description: description.trim(),
        district: shelter?.district,
      });
      Alert.alert('Request Sent', 'Your shelter request has been sent to the district officer.', [
        { text: 'View My Requests', onPress: () => router.replace('/(user)/shelters/my-requests' as any) },
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
        <Text style={styles.headerTitle}>Request Shelter</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.content} enableOnAndroid extraScrollHeight={20}>
        {loadingShelter ? (
          <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
        ) : shelter ? (
          <View style={styles.shelterBanner}>
            <Ionicons name="home" size={20} color={Colors.primary} />
            <Text style={styles.shelterBannerText}>Requesting: {shelter.name}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Location</Text>
        <TouchableOpacity
          style={styles.locationBox}
          onPress={() => router.push({ pathname: '/(user)/pick-location', params: { returnTo: `/(user)/shelters/request/${id}` } } as any)}
        >
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text style={styles.locationText} numberOfLines={2}>{locationLabel}</Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        <FormInput
          label="Number of People"
          keyboardType="number-pad"
          value={peopleCount}
          onChangeText={setPeopleCount}
          placeholder="e.g., 4"
        />

        <TextAreaInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Water is entering the house."
          maxLength={500}
        />
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
  shelterBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5F2', borderRadius: 12, padding: 12, marginBottom: 20 },
  shelterBannerText: { fontSize: 13, fontWeight: '700', color: Colors.primary, flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMedium, marginBottom: 8 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, backgroundColor: Colors.inputBg, padding: 14, marginBottom: 16 },
  locationText: { flex: 1, fontSize: 13, color: Colors.textDark },
  changeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#EEF3F1' },
});
