import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader } from '../../components/DMCNavHeader';
import { FormInput } from '../../components/FormInput';
import { TextAreaInput } from '../../components/TextAreaInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LocationPickerMap } from '../../components/LocationPickerMap';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../hooks/useReports';
import { useWarnings } from '../../hooks/useWarnings';
import { createWarning, updateWarning } from '../../services/alertService';
import { linkFloodIncidentWarning } from '../../services/floodIncidentReviewService';
import { DisasterType } from '../../types/report';
import { RiskLevel, RISK_LEVELS, WarningLocation } from '../../types/alert';
import { DEFAULT_REGION } from '../../utils/reportMap';
import { ExistingWarningZone, IncidentPin } from '../../utils/warningMapHtml';
import { getWarningStatus } from '../../utils/warningStatus';

// Optional prefill, e.g. from an approved flood incident's "Publish Public Warning"
// (app/(DMC)/flood-incident/[id].tsx) or from editing an existing warning (the
// alerts list's "Edit" button, which sets `warningId` plus every field) — every
// field falls back to the screen's usual defaults when reached normally (from the
// dashboard's "Create Public Warning"). A type literal (not `interface`) so it
// structurally satisfies useLocalSearchParams' UnknownOutputParams
// (Record<string, string | string[]>) constraint.
type WarningPrefillParams = {
  warningId?: string;
  title?: string;
  hazardType?: string;
  riskLevel?: string;
  affectedArea?: string;
  message?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  polygon?: string;
  originalCreatedAt?: string;
  sourceReportId?: string;
  incidentId?: string;
};

const HAZARD_OPTIONS: { key: DisasterType; label: string; icon: 'flood' | 'landslide' }[] = [
  { key: 'flood', label: 'Flood', icon: 'flood' },
  { key: 'landslide', label: 'Landslide', icon: 'landslide' },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  LOW: { label: 'LOW', color: '#2E75D6', bg: '#E8F1FB' },
  MEDIUM: { label: 'MEDIUM', color: '#B7860B', bg: '#FEF9E7' },
  HIGH: { label: 'HIGH', color: Colors.warning, bg: '#FEF5E7' },
  CRITICAL: { label: 'CRITICAL', color: Colors.danger, bg: '#FDEDEC' },
};

const DURATION_OPTIONS: { key: string; label: string; hours: number }[] = [
  { key: '6h', label: '6 hours', hours: 6 },
  { key: '12h', label: '12 hours', hours: 12 },
  { key: '24h', label: '24 hours', hours: 24 },
  { key: '3d', label: '3 days', hours: 72 },
];

function formatDateTime(date: Date) {
  return date.toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CreateWarningScreen() {
  const { user } = useAuth();
  const { reports: verifiedReports } = useReports('Verified');
  const { warnings: allWarnings } = useWarnings();
  const params = useLocalSearchParams<WarningPrefillParams>();
  const isEditMode = !!params.warningId;

  const [title, setTitle] = useState(params.title ?? '');
  const [hazardType, setHazardType] = useState<DisasterType>(params.hazardType === 'landslide' ? 'landslide' : 'flood');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>((RISK_LEVELS as string[]).includes(params.riskLevel ?? '') ? (params.riskLevel as RiskLevel) : 'HIGH');
  const [affectedArea, setAffectedArea] = useState(params.affectedArea ?? '');
  const [message, setMessage] = useState(params.message ?? '');
  const [durationHours, setDurationHours] = useState(6);
  const [coords, setCoords] = useState({
    latitude: params.lat ? Number(params.lat) : DEFAULT_REGION.latitude,
    longitude: params.lng ? Number(params.lng) : DEFAULT_REGION.longitude,
  });
  const [radius, setRadius] = useState<number>(params.radius ? Number(params.radius) : 300);
  const [polygon, setPolygon] = useState<WarningLocation[] | null>(() => {
    if (!params.polygon) return null;
    try {
      return JSON.parse(params.polygon);
    } catch {
      return null;
    }
  });
  const [sourceReportId, setSourceReportId] = useState<string | null>(params.sourceReportId ?? null);
  const sourceIncidentId = params.incidentId ?? null;
  const [incidentPickerVisible, setIncidentPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In edit mode this is the warning's real, original createdAt (passed in as a
  // param) — never overwritten by the save. "Expires" always reflects whatever
  // duration is picked below, computed from now, so re-saving with a fresh
  // duration is how an officer extends (or effectively reactivates) a warning.
  const createdAt = useMemo(() => (params.originalCreatedAt ? new Date(params.originalCreatedAt) : new Date()), [params.originalCreatedAt]);
  const expiresAt = useMemo(() => new Date(Date.now() + durationHours * 60 * 60 * 1000), [durationHours]);

  // Verified incidents with saved coordinates show up as reference pins on the
  // map (the "multiple incidents" case) and can be tapped in the picker below
  // to prefill the zone instead of the officer hunting down coordinates by hand.
  const incidentPins: IncidentPin[] = useMemo(
    () =>
      verifiedReports
        .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .map((r) => ({ id: r.id, lat: r.latitude!, lng: r.longitude!, label: `${r.disasterType === 'flood' ? 'Flood' : 'Landslide'} · ${r.affectedArea}` })),
    [verifiedReports]
  );

  // Already-published warnings show up as read-only reference shapes on the
  // Warning Zone map so the officer can see what's already covered before
  // placing a new (or edited) zone — excludes the warning being edited itself
  // and anything no longer Active (Expired/Cancelled zones aren't "published").
  const existingWarningZones: ExistingWarningZone[] = useMemo(
    () =>
      allWarnings
        .filter((w) => w.id !== params.warningId && getWarningStatus(w) === 'Active')
        .map((w) => ({
          id: w.id,
          label: `${w.hazardType === 'flood' ? 'Flood' : 'Landslide'} · ${w.affectedArea}`,
          riskLevel: w.riskLevel,
          latitude: w.latitude,
          longitude: w.longitude,
          radius: w.radius,
          polygon: w.polygon ?? null,
        })),
    [allWarnings, params.warningId]
  );

  const handlePickIncident = (report: (typeof verifiedReports)[number]) => {
    if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') {
      Alert.alert('No coordinates', 'This report has no saved GPS location.');
      return;
    }
    setCoords({ latitude: report.latitude, longitude: report.longitude });
    setAffectedArea(report.affectedArea);
    setHazardType(report.disasterType);
    setSourceReportId(report.id);
    setIncidentPickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required field', 'Please enter a warning title.');
      return;
    }
    if (!affectedArea.trim()) {
      Alert.alert('Required field', 'Please enter the affected area.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required field', 'Please enter a warning message.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a warning.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditMode) {
        await updateWarning(params.warningId!, {
          title: title.trim(),
          hazardType,
          riskLevel,
          affectedArea: affectedArea.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius,
          polygon,
          message: message.trim(),
          expiresAt,
        });

        Alert.alert('Warning updated', 'Your changes have been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const warningId = await createWarning({
        title: title.trim(),
        hazardType,
        riskLevel,
        affectedArea: affectedArea.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius,
        polygon,
        message: message.trim(),
        expiresAt,
        createdBy: user.uid,
        createdByName: user.email,
        sourceReportId,
      });

      if (sourceIncidentId) {
        await linkFloodIncidentWarning(sourceIncidentId, warningId);
      }

      Alert.alert('Warning created', 'The public warning has been published.', [
        { text: 'OK', onPress: () => router.replace('/(DMC)/alerts' as any) },
      ]);
    } catch (error: any) {
      Alert.alert(isEditMode ? 'Failed to save changes' : 'Failed to create warning', error.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader
        eyebrow="DMC · PUBLIC WARNING"
        title={isEditMode ? 'Edit Public Warning' : 'Create Public Warning'}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={100}
      >
        <FormInput label="Title" placeholder="e.g. Flood Warning" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Hazard Type</Text>
        <View style={styles.hazardRow}>
          {HAZARD_OPTIONS.map((option) => {
            const active = option.key === hazardType;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.hazardChip, active && styles.hazardChipActive]}
                activeOpacity={0.8}
                onPress={() => setHazardType(option.key)}
              >
                <MaterialIcons name={option.icon} size={18} color={active ? Colors.white : Colors.textMuted} />
                <Text style={[styles.hazardLabel, active && styles.hazardLabelActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Risk Level</Text>
        <View style={styles.riskRow}>
          {RISK_LEVELS.map((level) => {
            const active = level === riskLevel;
            const config = RISK_CONFIG[level];
            return (
              <TouchableOpacity
                key={level}
                style={[styles.riskChip, { borderColor: active ? config.color : '#E3F0EC', backgroundColor: active ? config.bg : Colors.white }]}
                activeOpacity={0.8}
                onPress={() => setRiskLevel(level)}
              >
                <View style={[styles.riskDot, { backgroundColor: config.color }]} />
                <Text style={[styles.riskLabel, { color: active ? config.color : Colors.textMuted }]}>{config.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Affected Area</Text>
          {verifiedReports.length > 0 && (
            <TouchableOpacity onPress={() => setIncidentPickerVisible(true)}>
              <Text style={styles.linkText}>Select verified incident</Text>
            </TouchableOpacity>
          )}
        </View>
        <FormInput iconName="location" placeholder="e.g. Negombo" value={affectedArea} onChangeText={setAffectedArea} />
        {sourceReportId && (
          <View style={styles.sourceBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.sourceBadgeText}>Linked to a verified incident report</Text>
            <TouchableOpacity onPress={() => setSourceReportId(null)}>
              <Text style={styles.sourceBadgeClear}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Warning Zone</Text>
        <LocationPickerMap
          latitude={coords.latitude}
          longitude={coords.longitude}
          radius={radius}
          riskLevel={riskLevel}
          incidents={incidentPins}
          polygon={polygon}
          existingWarnings={existingWarningZones}
          onChangeLocation={setCoords}
          onChangeRadius={setRadius}
          onChangePolygon={setPolygon}
        />

        <TextAreaInput
          label="Message"
          placeholder="Describe the situation and any instructions for residents."
          maxLength={300}
          value={message}
          onChangeText={setMessage}
        />

        <Text style={styles.label}>Expires In</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((option) => {
            const active = option.hours === durationHours;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.durationChip, active && styles.durationChipActive]}
                activeOpacity={0.7}
                onPress={() => setDurationHours(option.hours)}
              >
                <Text style={[styles.durationLabel, active && styles.durationLabelActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.timestampCard}>
          <View style={styles.timestampRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.timestampText}>Created: {formatDateTime(createdAt)}</Text>
          </View>
          <View style={styles.timestampRow}>
            <Ionicons name="hourglass-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.timestampText}>Expires: {formatDateTime(expiresAt)}</Text>
          </View>
        </View>

        <PrimaryButton
          title={isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Warning'}
          onPress={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={{ marginTop: 8 }}
        />
      </KeyboardAwareScrollView>

      <Modal visible={incidentPickerVisible} transparent animationType="fade" onRequestClose={() => setIncidentPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setIncidentPickerVisible(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Select Verified Incident</Text>
            <ScrollView style={styles.pickerList}>
              {verifiedReports.map((report) => (
                <TouchableOpacity key={report.id} style={styles.pickerRow} activeOpacity={0.7} onPress={() => handlePickIncident(report)}>
                  <MaterialIcons
                    name={report.disasterType === 'flood' ? 'flood' : 'landslide'}
                    size={18}
                    color={report.disasterType === 'flood' ? '#2E75D6' : '#8A5A2B'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowText}>{report.affectedArea}</Text>
                    <Text style={styles.pickerRowMeta}>{report.referenceNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMedium,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  hazardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  hazardChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  hazardChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  hazardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  hazardLabelActive: {
    color: Colors.white,
  },
  riskRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  riskChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  riskDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  riskLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  sourceBadgeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  sourceBadgeClear: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  durationChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  durationLabelActive: {
    color: Colors.white,
  },
  timestampCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F5F4',
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,61,57,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
  },
  pickerRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  pickerRowMeta: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },
});
