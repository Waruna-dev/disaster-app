import React, { useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { StatTile } from '../../components/StatTile';
import { useReports } from '../../hooks/useReports';
import { DisasterType } from '../../types/report';
import { groupPendingReports, ungroupedPendingReports, ReportGroup } from '../../utils/reportGrouping';

type TypeFilter = 'all' | DisasterType;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'flood', label: 'Flood' },
  { key: 'landslide', label: 'Landslide' },
];

const DISASTER_CONFIG: Record<DisasterType, { icon: keyof typeof Ionicons.glyphMap; label: string; bg: string; tint: string }> = {
  flood: { icon: 'water', label: 'Flood', bg: '#E8F1FB', tint: '#2E75D6' },
  landslide: { icon: 'triangle', label: 'Landslide', bg: '#F1EBE3', tint: '#8A5A2B' },
};

// Resident reports -> automatic grouping -> one card per incident cluster.
// Grouping logic lives in utils/reportGrouping.ts; this screen just renders it.
export default function ReportGroupsScreen() {
  const { reports, loading } = useReports('Pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const groups = useMemo(() => groupPendingReports(reports), [reports]);
  const ungrouped = useMemo(() => ungroupedPendingReports(reports, groups), [reports, groups]);

  const visibleGroups = useMemo(
    () => (typeFilter === 'all' ? groups : groups.filter((g) => g.disasterType === typeFilter)),
    [groups, typeFilter]
  );

  const floodGroups = groups.filter((g) => g.disasterType === 'flood').length;
  const landslideGroups = groups.filter((g) => g.disasterType === 'landslide').length;

  const openGroup = (group: ReportGroup) => {
    router.push({
      pathname: '/(DMC)/group-details',
      params: { ids: group.reports.map((r) => r.id).join(','), groupId: group.id },
    } as any);
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader
        eyebrow="DMC · GROUPED REVIEW"
        title="Report Groups"
        scrollY={scrollY}
        onBack={() => router.push('/(DMC)/incidents' as any)}
      />

      <Animated.FlatList
        data={visibleGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <View style={styles.statsGrid}>
              <StatTile
                icon="git-network-outline"
                value={String(groups.length)}
                label="Groups"
                tint={Colors.primary}
                tintBg="#E8F5F2"
                compact
              />
              <StatTile
                icon="water-outline"
                value={String(floodGroups)}
                label="Flood"
                tint={DISASTER_CONFIG.flood.tint}
                tintBg={DISASTER_CONFIG.flood.bg}
                compact
              />
              <StatTile
                icon="triangle-outline"
                value={String(landslideGroups)}
                label="Landslide"
                tint={DISASTER_CONFIG.landslide.tint}
                tintBg={DISASTER_CONFIG.landslide.bg}
                compact
              />
            </View>

            <Text style={styles.flowHint}>
              {reports.length} resident report{reports.length === 1 ? '' : 's'} auto-grouped into {groups.length} incident
              {groups.length === 1 ? '' : 's'}
              {ungrouped.length > 0 ? ` · ${ungrouped.length} ungrouped` : ''}
            </Text>

            <View style={styles.filterRow}>
              {TYPE_FILTERS.map((filter) => {
                const isActive = filter.key === typeFilter;
                return (
                  <TouchableOpacity key={filter.key} style={styles.filterTab} activeOpacity={0.7} onPress={() => setTypeFilter(filter.key)}>
                    <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{filter.label}</Text>
                    {isActive && <View style={styles.filterUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => <GroupCard group={item} onView={() => openGroup(item)} />}
        ListEmptyComponent={
          loading ? (
            <View>
              {[0, 1].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="git-network-outline" size={40} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No grouped incidents yet</Text>
              <Text style={styles.emptySub}>Nearby reports of the same disaster type merge into a group automatically.</Text>
            </View>
          )
        }
      />

      <DMCTabBar active="incidents" />
    </View>
  );
}

function GroupCard({ group, onView }: { group: ReportGroup; onView: () => void }) {
  const disaster = DISASTER_CONFIG[group.disasterType];
  const thumbs = group.reports
    .map((r) => r.photoUrls?.[0] ?? r.photoUrl)
    .filter((uri): uri is string => !!uri)
    .slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{group.id}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{group.reports.length} REPORTS</Text>
        </View>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.mainColumn}>
          <View style={styles.typeRow}>
            <View style={[styles.typeIcon, { backgroundColor: disaster.bg }]}>
              <Ionicons name={disaster.icon} size={18} color={disaster.tint} />
            </View>
            <Text style={styles.typeLabel}>{disaster.label}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{group.affectedArea}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {group.reports.map((r) => r.referenceNumber).join(', ')}
            </Text>
          </View>
        </View>

        {thumbs.length > 0 && (
          <View style={styles.thumbStack}>
            {thumbs.map((uri, i) => (
              <Image key={uri + i} source={{ uri }} style={[styles.thumbnail, { marginLeft: i === 0 ? 0 : -16, zIndex: thumbs.length - i }]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.viewButton} activeOpacity={0.8} onPress={onView}>
        <Text style={styles.viewButtonText}>View Group</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  flowHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F0EC',
  },
  filterTab: {
    marginRight: 24,
    paddingBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  filterUnderline: {
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: 8,
    borderRadius: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#E8F5F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mainColumn: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textLight,
    flexShrink: 1,
  },
  thumbStack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E3EFEC',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginBottom: 12,
  },
  viewButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  skeletonCard: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#E3EFEC',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
