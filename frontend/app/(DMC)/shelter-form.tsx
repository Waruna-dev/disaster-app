import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { FormInput } from '../../components/FormInput';
import { TextAreaInput } from '../../components/TextAreaInput';
import { SelectField } from '../../components/SelectField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { SHELTER_FACILITIES } from '../../types/shelter';
import { createShelter, updateShelter, fetchShelterById, deriveShelterStatus } from '../../services/shelterService';
import * as Location from 'expo-location';

export default function ShelterFormScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [currentOccupancy, setCurrentOccupancy] = useState('0');
  const [facilities, setFacilities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const shelter = await fetchShelterById(id as string);
      if (shelter) {
        setName(shelter.name);
        setDistrict(shelter.district);
        setLocation(shelter.location);
        setCapacity(String(shelter.capacity));
        setCurrentOccupancy(String(shelter.currentOccupancy));
        setFacilities(shelter.facilities);
        setNotes(shelter.notes || '');
        setCoords({ latitude: shelter.latitude, longitude: shelter.longitude });
      }
      setLoading(false);
    })();
  }, [id]);

  const toggleFacility = (f: string) => {
    setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  // Best-effort geocode of the typed address, so the shelter still gets map coordinates
  // without requiring the officer to drop a pin manually.
  const resolveCoordsIfNeeded = async (): Promise<{ latitude: number; longitude: number }> => {
    if (coords) return coords;
    try {
      const results = await Location.geocodeAsync(`${location}, ${district}, Sri Lanka`);
      if (results?.[0]) return { latitude: results[0].latitude, longitude: results[0].longitude };
    } catch {}
    // Fall back to Sri Lanka's centroid — the officer can still see/manage the shelter,
    // it just won't be pinpoint-accurate on the map until edited with a resolvable address.
    return { latitude: 7.8731, longitude: 80.7718 };
  };

  const handleSave = async () => {
    if (!name.trim() || !district || !location.trim() || !capacity.trim()) {
      Alert.alert('Missing information', 'Please fill in shelter name, district, location and capacity.');
      return;
    }
    const capacityNum = parseInt(capacity, 10);
    const occupancyNum = parseInt(currentOccupancy || '0', 10);
    if (!capacityNum || capacityNum <= 0) {
      Alert.alert('Invalid capacity', 'Capacity must be a positive number.');
      return;
    }

    try {
      setSaving(true);
      const resolvedCoords = await resolveCoordsIfNeeded();
      const status = deriveShelterStatus(capacityNum, occupancyNum);
      const payload = {
        name: name.trim(),
        district,
        location: location.trim(),
        latitude: resolvedCoords.latitude,
        longitude: resolvedCoords.longitude,
        capacity: capacityNum,
        currentOccupancy: occupancyNum,
        facilities,
        status,
        notes: notes.trim() || undefined,
      };

      if (isEditing) {
        await updateShelter(id as string, payload);
      } else {
        await createShelter(payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DMCNavHeader
        eyebrow="DISTRICT OFFICER · SHELTERS"
        title={isEditing ? 'Edit Shelter Details' : 'Register Shelter'}
        scrollY={scrollY}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content} enableOnAndroid extraScrollHeight={20}>
        <FormInput label="Shelter Name *" value={name} onChangeText={setName} placeholder="Enter shelter name" />

        <SelectField label="District *" placeholder="Select district" value={district} options={SRI_LANKA_DISTRICTS} onSelect={setDistrict} />

        <TextAreaInput label="Location / Address" value={location} onChangeText={setLocation} placeholder="Enter full address or location details" maxLength={200} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput label="Capacity *" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} placeholder="e.g., 500" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FormInput label="Current Occupancy" keyboardType="number-pad" value={currentOccupancy} onChangeText={setCurrentOccupancy} placeholder="e.g., 0" />
          </View>
        </View>

        <Text style={styles.label}>Facilities</Text>
        <View style={styles.facilitiesWrap}>
          {SHELTER_FACILITIES.map((f) => {
            const active = facilities.includes(f);
            return (
              <TouchableOpacity key={f} style={[styles.facilityChip, active && styles.facilityChipActive]} onPress={() => toggleFacility(f)}>
                <Ionicons name={active ? 'checkbox' : 'square-outline'} size={16} color={active ? Colors.primary : Colors.iconColor} />
                <Text style={[styles.facilityText, active && styles.facilityTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextAreaInput label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Enter any additional information (optional)" maxLength={300} />

        <View style={{ height: 20 }} />
        <PrimaryButton title={isEditing ? 'Save Changes' : 'Save Shelter'} loading={saving} onPress={handleSave} />
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textMedium, marginBottom: 10 },
  facilitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  facilityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.white },
  facilityChipActive: { borderColor: Colors.primary, backgroundColor: '#E8F5F2' },
  facilityText: { fontSize: 12, color: Colors.textMedium, fontWeight: '600' },
  facilityTextActive: { color: Colors.primary },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
});
