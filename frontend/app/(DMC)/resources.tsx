import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { SelectField } from '../../components/SelectField';
import { FormInput } from '../../components/FormInput';
import { TextAreaInput } from '../../components/TextAreaInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { Resource, ResourceDistribution, RESOURCE_CATEGORIES, ResourceCategory } from '../../types/resource';
import {
  fetchAllResources, createResource, updateResource, deleteResource,
  recordDistribution, fetchDistributions,
} from '../../services/resourceService';

type Tab = 'manage' | 'record' | 'history';
const today = () => new Date().toISOString().slice(0, 10);
const RESOURCE_UNITS = ['Pieces', 'Bottles', 'Litres', 'Packs', 'Boxes', 'Kits', 'Cans', 'Bags', 'kg', 'Metres', 'Rolls', 'Tents', 'Blankets', 'Mats', 'Sheets', 'Pairs', 'Tubes', 'Bars'];

export default function DmcResourcesScreen() {
  const { scrollY, onScroll } = useDMCScrollHeader();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('manage');
  const [resources, setResources] = useState<Resource[]>([]);
  const [distributions, setDistributions] = useState<ResourceDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  // resource form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [rName, setRName] = useState('');
  const [rCategory, setRCategory] = useState<string | null>(null);
  const [rUnit, setRUnit] = useState('');
  const [rTotal, setRTotal] = useState('');
  const [rAvailable, setRAvailable] = useState('');
  const [saving, setSaving] = useState(false);

  // distribution form
  const [dResourceName, setDResourceName] = useState<string | null>(null);
  const [dQty, setDQty] = useState('');
  const [dDistrict, setDDistrict] = useState<string | null>(null);
  const [dDate, setDDate] = useState(today());
  const [dNotes, setDNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([fetchAllResources(), fetchDistributions()]);
      setResources(r);
      setDistributions(d);
    } catch {
      Alert.alert('Error', 'Could not load resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectedResource = useMemo(() => resources.find((r) => r.name === dResourceName) ?? null, [resources, dResourceName]);

  const stats = useMemo(() => ({
    types: resources.length,
    low: resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2).length,
    distributed: distributions.length,
  }), [resources, distributions]);

  const openForm = (res?: Resource) => {
    setEditing(res ?? null);
    setRName(res?.name ?? '');
    setRCategory(res?.category ?? null);
    setRUnit(res?.unit ?? '');
    setRTotal(res ? String(res.totalQuantity) : '');
    setRAvailable(res ? String(res.availableQuantity) : '');
    setFormOpen(true);
  };

  const handleSaveResource = async () => {
    const total = parseInt(rTotal, 10);
    const available = rAvailable.trim() === '' ? total : parseInt(rAvailable, 10);
    if (!rName.trim() || !rCategory || !rUnit.trim() || isNaN(total) || total < 0 || isNaN(available)) {
      Alert.alert('Missing information', 'Please fill in name, category, unit and total quantity.');
      return;
    }
    if (available > total) {
      Alert.alert('Invalid quantity', 'Available quantity cannot exceed total quantity.');
      return;
    }
    try {
      setSaving(true);
      const payload = { name: rName.trim(), category: rCategory as ResourceCategory, unit: rUnit.trim(), totalQuantity: total, availableQuantity: available };
      if (editing) await updateResource(editing.id, payload);
      else await createResource(payload);
      setFormOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = (res: Resource) => {
    Alert.alert('Remove Resource', `Remove "${res.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteResource(res.id); load(); } },
    ]);
  };

  const handleRecord = async () => {
    const qty = parseInt(dQty, 10);
    if (!selectedResource || !dDistrict || !qty || qty < 1) {
      Alert.alert('Missing information', 'Select a resource, quantity and district.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dDate)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }
    try {
      setSaving(true);
      await recordDistribution({
        resourceId: selectedResource.id,
        quantity: qty,
        district: dDistrict,
        distributionDate: dDate,
        notes: dNotes.trim() || undefined,
        recordedBy: user?.uid,
      });
      setDQty(''); setDNotes(''); setDDistrict(null);
      await load();
      Alert.alert('Distribution recorded', 'Stock has been updated.');
      setTab('history');
    } catch (e: any) {
      Alert.alert('Could not record', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DISTRICT OFFICER · RESOURCES" title="Relief Resources" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      <View style={styles.tabs}>
        {([['manage', 'Manage'], ['record', 'Record Distribution'], ['history', 'History']] as [Tab, string][]).map(([k, l]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab === k && styles.tabActive]} onPress={() => setTab(k)}>
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
      ) : tab === 'manage' ? (
        <FlatList
          data={resources}
          keyExtractor={(i) => i.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <StatTile icon="cube" value={String(stats.types)} label="Resource Types" tint="#1D6FC4" tintBg="#E3F0FC" compact />
                <StatTile icon="warning" value={String(stats.low)} label="Low Stock" tint="#D32F2F" tintBg="#FCE8E8" compact />
                <StatTile icon="send" value={String(stats.distributed)} label="Distributions" tint={Colors.primary} tintBg="#E8F5F2" compact />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.addBtnText}>Add Resource</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No resources yet. Add your first one.</Text>}
          renderItem={({ item }) => {
            const pct = item.totalQuantity > 0 ? Math.round((item.availableQuantity / item.totalQuantity) * 100) : 0;
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.category}</Text>
                  <View style={styles.barBg}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct > 50 ? '#2E7D32' : pct > 20 ? '#F9A825' : '#D32F2F' }]} /></View>
                  <Text style={styles.rowMeta}>{item.availableQuantity.toLocaleString()} / {item.totalQuantity.toLocaleString()} {item.unit}</Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openForm(item)}><Ionicons name="create-outline" size={18} color={Colors.textMedium} /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteResource(item)}><Ionicons name="trash-outline" size={18} color={Colors.danger} /></TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : tab === 'record' ? (
        <ScrollView contentContainerStyle={styles.listContent} onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
          <SelectField label="Select Resource *" value={dResourceName} options={resources.map((r) => r.name)} onSelect={setDResourceName} />
          {selectedResource && (
            <View style={styles.availBox}>
              <Text style={styles.availTitle}>Current Availability</Text>
              <Text style={styles.availText}>
                {selectedResource.availableQuantity.toLocaleString()} of {selectedResource.totalQuantity.toLocaleString()} {selectedResource.unit}
              </Text>
            </View>
          )}
          <FormInput label={`Quantity *${selectedResource ? ` (${selectedResource.unit})` : ''}`} keyboardType="number-pad" value={dQty} onChangeText={setDQty} placeholder="e.g., 100" />
          <SelectField label="Distribute To (District) *" value={dDistrict} options={SRI_LANKA_DISTRICTS} onSelect={setDDistrict} />
          <FormInput label="Distribution Date *" value={dDate} onChangeText={setDDate} placeholder="YYYY-MM-DD" />
          <TextAreaInput label="Additional Notes (Optional)" value={dNotes} onChangeText={setDNotes} placeholder="Special instructions, recipient details, etc." maxLength={300} />
          <PrimaryButton title="Record Distribution" loading={saving} onPress={handleRecord} />
        </ScrollView>
      ) : (
        <FlatList
          data={distributions}
          keyExtractor={(i) => i.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No distributions recorded yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}><Ionicons name="send" size={16} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.quantity.toLocaleString()} {item.unit} · {item.resourceName}</Text>
                <Text style={styles.rowMeta}>To {item.district} · {item.distributionDate}</Text>
                {item.notes ? <Text style={styles.rowMeta}>{item.notes}</Text> : null}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setFormOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit Resource' : 'Add Resource'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <FormInput label="Name *" value={rName} onChangeText={setRName} placeholder="e.g., Drinking Water" />
              <SelectField label="Category *" value={rCategory} options={RESOURCE_CATEGORIES} onSelect={setRCategory} />
              <SelectField label="Unit *" value={rUnit || null} options={RESOURCE_UNITS} onSelect={setRUnit} />
              <FormInput label="Total Quantity *" keyboardType="number-pad" value={rTotal} onChangeText={setRTotal} placeholder="e.g., 5000" />
              <FormInput label="Available Quantity" keyboardType="number-pad" value={rAvailable} onChangeText={setRAvailable} placeholder="Defaults to total" />
              <PrimaryButton title={editing ? 'Save Changes' : 'Save Resource'} loading={saving} onPress={handleSaveResource} />
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 14 }} onPress={() => setFormOpen(false)}>
                <Text style={{ fontWeight: '700', color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DMCTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 4, marginBottom: 8, backgroundColor: '#E8F0EE', borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  listContent: { padding: 16, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 14 },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: 30 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEF3F1', gap: 10 },
  rowName: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  rowMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F9F7' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center' },
  barBg: { height: 6, backgroundColor: '#EEF3F1', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 6, borderRadius: 3 },
  availBox: { backgroundColor: '#E8F5F2', borderRadius: 12, padding: 12, marginBottom: 16 },
  availTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 2 },
  availText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
});
