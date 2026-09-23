import React, { useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { DMCNavHeader, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { WarningsMapModal } from '../../components/WarningsMapModal';
import { useWarnings } from '../../hooks/useWarnings';
import { cancelWarning } from '../../services/alertService';
import { Warning, RiskLevel } from '../../types/alert';
import { WarningMapItem } from '../../utils/warningsMapHtml';
import { getWarningStatus } from '../../utils/warningStatus';

type FilterKey = 'active' | 'all';

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string }> = {
  LOW: { color: '#2E75D6', bg: '#E8F1FB' },
  MEDIUM: { color: '#B7860B', bg: '#FEF9E7' },
  HIGH: { color: Colors.warning, bg: '#FEF5E7' },
  CRITICAL: { color: Colors.danger, bg: '#FDEDEC' },
};

function formatDateTime(timestamp: Warning['createdAt']) {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AlertsScreen() {
  const { warnings, loading } = useWarnings();
  const [filter, setFilter] = useState<FilterKey>('active');
  const [showMap, setShowMap] = useState(false);
  const { scrollY, onScroll, headerHeight } = useDMCScrollHeader();

  const visible = useMemo(
    () => (filter === 'active' ? warnings.filter((w) => getWarningStatus(w) === 'Active') : warnings),
    [warnings, filter]
  );

  const mapItems: WarningMapItem[] = useMemo(
    () =>
      visible.map((w) => ({
        id: w.id,
        title: w.title,
        affectedArea: w.affectedArea,
        hazardType: w.hazardType,
        riskLevel: w.riskLevel,
        status: getWarningStatus(w),
        latitude: w.latitude,
        longitude: w.longitude,
        radius: w.radius,
        polygon: w.polygon ?? null,
      })),
    [visible]
  );

  const handleEdit = (warning: Warning) => {
    router.push({
      pathname: '/(DMC)/create-alert',
      params: {
        warningId: warning.id,
        title: warning.title,
        hazardType: warning.hazardType,
        riskLevel: warning.riskLevel,
        affectedArea: warning.affectedArea,
        message: warning.message,
        lat: String(warning.latitude),
        lng: String(warning.longitude),
        radius: String(warning.radius),
        polygon: warning.polygon && warning.polygon.length >= 3 ? JSON.stringify(warning.polygon) : undefined,
        originalCreatedAt: warning.createdAt ? warning.createdAt.toDate().toISOString() : undefined,
      },
    } as any);
  };

  const handleEditById = (id: string) => {
    const warning = warnings.find((w) => w.id === id);
    if (!warning) return;
    setShowMap(false);
    handleEdit(warning);
  };

  const handleCancel = (warning: Warning) => {
    Alert.alert('Cancel warning', `Cancel "${warning.title}"? Residents will no longer see it as active.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel warning',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelWarning(warning.id);
          } catch (error: any) {
            Alert.alert('Failed', error.message || 'Could not cancel the warning.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <DMCNavHeader eyebrow="DMC · PUBLIC WARNINGS" title="Public Warnings" scrollY={scrollY} onBack={() => router.push('/(DMC)/dashboard' as any)} />

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 4 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.filterRow}>
          {(['active', 'all'] as FilterKey[]).map((key) => {
            const active = key === filter;
            return (
              <TouchableOpacity key={key} style={[styles.filterChip, active && styles.filterChipActive]} activeOpacity={0.7} onPress={() => setFilter(key)}>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{key === 'active' ? 'Active' : 'All'}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.mapViewButton} activeOpacity={0.7} onPress={() => setShowMap(true)}>
            <Ionicons name="map-outline" size={14} color={Colors.primary} />
            <Text style={styles.mapViewButtonText}>Map</Text>
          </TouchableOpacity>
        </View>

        {loading && warnings.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={40} color={Colors.primary} />
            <Text style={styles.emptyTitle}>{filter === 'active' ? 'No active warnings' : 'No warnings yet'}</Text>
            <Text style={styles.emptySubtitle}>Tap the + button to publish a public warning.</Text>
          </View>
        ) : (
          visible.map((warning) => {
            const status = getWarningStatus(warning);
            const risk = RISK_CONFIG[warning.riskLevel] ?? RISK_CONFIG.HIGH;
            return (
              <View key={warning.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: risk.bg }]}>
                      <MaterialIcons name={warning.hazardType === 'flood' ? 'flood' : 'landslide'} size={18} color={risk.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{warning.title}</Text>
                      <Text style={styles.cardArea}>{warning.affectedArea}</Text>
                    </View>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.riskBadgeText, { color: risk.color }]}>{warning.riskLevel}</Text>
                  </View>
                </View>

                <Text style={styles.cardMessage} numberOfLines={2}>
                  {warning.message}
                </Text>

                <View style={styles.cardFooterRow}>
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: status === 'Active' ? Colors.primary : status === 'Expired' ? Colors.textMuted : Colors.danger }]} />
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    {warning.radius >= 1000 ? `${warning.radius / 1000}km` : `${warning.radius}m`} radius · Created {formatDateTime(warning.createdAt)}
                  </Text>
                </View>

                {status !== 'Cancelled' && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={() => handleEdit(warning)}>
                      <Ionicons name="create-outline" size={14} color={Colors.primary} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    {status === 'Active' && (
                      <TouchableOpacity style={styles.cancelButton} activeOpacity={0.7} onPress={() => handleCancel(warning)}>
                        <Text style={styles.cancelButtonText}>Cancel warning</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </Animated.ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(DMC)/create-alert' as any)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <WarningsMapModal
        visible={showMap}
        warnings={mapItems}
        onClose={() => setShowMap(false)}
        onEditWarning={handleEditById}
      />
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
    paddingBottom: 100,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mapViewButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  mapViewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E3F0EC',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  cardArea: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardMessage: {
    fontSize: 13,
    color: Colors.textMedium,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
  },
  cardMeta: {
    fontSize: 10,
    color: Colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingRight: 14,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
