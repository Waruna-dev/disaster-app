import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { Resource, RESOURCE_CATEGORIES } from '../../../types/resource';
import { fetchAllResources } from '../../../services/resourceService';

export default function UserResourcesScreen() {
  const insets = useSafeAreaInsets();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('All');

  useEffect(() => {
    (async () => {
      try {
        setResources(await fetchAllResources());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => (category === 'All' ? resources : resources.filter((r) => r.category === category)),
    [resources, category]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Relief Resources</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {['All', ...RESOURCE_CATEGORIES].map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No resources listed yet.</Text>}
          renderItem={({ item }) => {
            const pct = item.totalQuantity > 0 ? Math.round((item.availableQuantity / item.totalQuantity) * 100) : 0;
            const barColor = pct > 50 ? '#2E7D32' : pct > 20 ? '#F9A825' : '#D32F2F';
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}><Ionicons name="cube" size={20} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.category}>{item.category}</Text>
                  </View>
                  <Text style={styles.pct}>{pct}%</Text>
                </View>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} /></View>
                <Text style={styles.qty}>{item.availableQuantity.toLocaleString()} of {item.totalQuantity.toLocaleString()} {item.unit} available</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  chipScroll: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.inputBorder },
  chipActive: { backgroundColor: '#0B7A66', borderColor: '#0B7A66' },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textMedium },
  chipTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: 30 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEF3F1' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5F2', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  category: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pct: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  barBg: { height: 6, backgroundColor: '#EEF3F1', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  qty: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
});
