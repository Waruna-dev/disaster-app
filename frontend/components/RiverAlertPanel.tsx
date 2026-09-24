import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { fetchFloodEvents, getFloodStatus } from '../services/floodService';
import { FloodReading } from '../types/flood';

type Tab = 'alert' | 'minor' | 'major';

const DAYS = 4;

const TABS: Record<Tab, { label: string; title: string; headerBg: string; bodyBg: string; headerText: string }> = {
  alert: { label: 'Alert', title: 'Alert Level Stations', headerBg: '#F3F3F3', bodyBg: '#DCDCDC', headerText: '#1F2A28' },
  minor: { label: 'Minor', title: 'Minor Flood Level Stations', headerBg: '#F7B500', bodyBg: '#EFCB68', headerText: '#1F2A28' },
  major: { label: 'Major', title: 'Major Flood Level Stations', headerBg: '#FF0000', bodyBg: '#FF0000', headerText: '#1F2A28' },
};

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const date = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

/** River gauge readings from the last 4 days, grouped into Alert / Minor / Major tabs. */
export function RiverAlertPanel({ station }: { station?: string | null }) {
  const [events, setEvents] = useState<FloodReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('alert');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchFloodEvents(DAYS, signal));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message ?? 'Failed to load river alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const grouped = useMemo(() => {
    const groups: Record<Tab, FloodReading[]> = { alert: [], minor: [], major: [] };
    events.forEach((r) => {
      if (station && r.gauge !== station) return;
      const st = getFloodStatus(r.waterLevel, r.alertLevel, r.minorFloodLevel, r.majorFloodLevel);
      if (st === 'alert' || st === 'minor' || st === 'major') groups[st].push(r);
    });
    return groups;
  }, [events, station]);

  const config = TABS[tab];
  const rows = grouped[tab];
  const isMajor = tab === 'major';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { backgroundColor: config.headerBg }]}>
        <Text style={[styles.headerText, { color: config.headerText }]}>
          {config.title} (Last {DAYS} days)
        </Text>
      </View>

      <View style={[styles.body, { backgroundColor: config.bodyBg }]}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.center} />
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.8} onPress={() => load()}>
              <Ionicons name="refresh" size={14} color={Colors.white} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyRow}>
              <Ionicons name="information-circle-outline" size={16} color="#2E75D6" />
              <Text style={[styles.emptyText, isMajor && { color: Colors.white }]}>
                No {config.label} Flood Level Stations for the Last {DAYS} Days
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView nestedScrollEnabled style={styles.list}>
            {rows.map((r, i) => (
              <View key={`${r.gauge}-${r.timestamp}`} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowTitle}>
                  {formatTimestamp(r.timestamp)}  {r.gauge}  {r.waterLevel.toFixed(2)}m
                </Text>
                <Text style={styles.rowBasin}>
                  River Basin: <Text style={styles.rowBasinValue}>{r.basin}</Text>
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.tabBar}>
        {(Object.keys(TABS) as Tab[]).map((key) => {
          const active = key === tab;
          const count = grouped[key].length;
          return (
            <TouchableOpacity key={key} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8} onPress={() => setTab(key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {TABS[key].label}
                {!loading && !error && count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C9CFCD',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    height: 300,
  },
  list: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  rowBasin: {
    fontSize: 11,
    color: '#7A2E1F',
    marginTop: 3,
  },
  rowBasinValue: {
    color: '#1F2A28',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#1F2A28',
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2D2D2D',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabActive: {
    borderTopColor: '#3B9BE6',
  },
  tabText: {
    fontSize: 13,
    color: '#9A9A9A',
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
});
