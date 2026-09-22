import React, { useMemo, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { DMCHeader, DMCHeaderBackground, DMC_HEADER_COMPACT_HEIGHT } from './DMCHeader';
import { useReports } from '../hooks/useReports';
import { Report } from '../types/report';

const MENU_LINKS: { label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { label: 'Home', icon: 'home-outline', route: '/(DMC)/dashboard' },
  { label: 'Incidents', icon: 'document-text-outline', route: '/(DMC)/incidents' },
  { label: 'Map', icon: 'location-outline', route: '/(DMC)/map' },
  { label: 'All Reports', icon: 'albums-outline', route: '/(DMC)/reports' },
  { label: 'Public Warnings', icon: 'megaphone-outline', route: '/(DMC)/alerts' },
];

interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DMCMenuModal({ visible, onClose }: ModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.menuPanel, { top: insets.top + 58 }]} onPress={() => {}}>
          {MENU_LINKS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                router.push(item.route as any);
              }}
            >
              <Ionicons name={item.icon} size={18} color={Colors.primary} />
              <Text style={styles.menuRowText}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              router.push('/(user)/(tabs)' as any);
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={Colors.textDark} />
            <Text style={styles.menuRowText}>Back to Resident App</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DMCNotificationsModal({ visible, onClose, pendingReports }: ModalProps & { pendingReports: Report[] }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.notifPanel, { top: insets.top + 58 }]} onPress={() => {}}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Pending Reports</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.notifClear}>Clear</Text>
            </TouchableOpacity>
          </View>

          {pendingReports.length === 0 ? (
            <Text style={styles.notifEmpty}>No pending reports</Text>
          ) : (
            pendingReports.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.notifRow}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  router.push(`/(DMC)/incident/${item.id}` as any);
                }}
              >
                <View style={styles.notifDot} />
                <Text style={styles.notifText} numberOfLines={1}>
                  {item.disasterType === 'flood' ? 'Flood' : 'Landslide'} in {item.affectedArea}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {pendingReports.length > 0 && (
            <TouchableOpacity
              style={styles.notifViewAll}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                router.push('/(DMC)/incidents' as any);
              }}
            >
              <Text style={styles.notifViewAllText}>View all pending reports</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Scroll state for the slide-away header. Spread `onScroll` onto an Animated.ScrollView /
 * Animated.FlatList, pass `scrollY` to <DMCNavHeader>, and pad the content by `headerHeight`
 * so it starts below the (absolutely positioned) header.
 */
export function useDMCScrollHeader() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY]
  );
  return { scrollY, onScroll, headerHeight: DMC_HEADER_COMPACT_HEIGHT + insets.top };
}

interface DMCNavHeaderProps {
  eyebrow: string;
  title: string;
  /**
   * Enables the Facebook-style collapsing header: scrolling down slides the title area away
   * (the menu/bell bar stays pinned), and scrolling up even a little brings it straight back.
   * Omit for a static in-flow header (e.g. the map, which doesn't scroll).
   */
  scrollY?: Animated.Value;
  /** Swaps the menu button for a back arrow (for pages reached from elsewhere). */
  onBack?: () => void;
}

// The DMC main-nav header: hamburger menu on the left, pending-reports bell on the right.
export function DMCNavHeader({ eyebrow, title, scrollY, onBack }: DMCNavHeaderProps) {
  const insets = useSafeAreaInsets();
  const { reports: pendingReports } = useReports('Pending');
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const headerHeight = DMC_HEADER_COMPACT_HEIGHT + insets.top;
  const iconBarPaddingTop = insets.top + 14;
  const iconBarHeight = iconBarPaddingTop + 36 + 4;

  // diffClamp tracks the scroll *delta* rather than absolute position, so "up" always
  // wins immediately instead of only once you're back at the top.
  const headerTranslateY = useMemo(
    () =>
      scrollY
        ? Animated.diffClamp(scrollY, 0, headerHeight).interpolate({
            inputRange: [0, headerHeight],
            outputRange: [0, -headerHeight],
            extrapolate: 'clamp',
          })
        : null,
    [scrollY, headerHeight]
  );

  const modals = (
    <>
      <DMCMenuModal visible={showMenu} onClose={() => setShowMenu(false)} />
      <DMCNotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        pendingReports={pendingReports}
      />
    </>
  );

  if (!headerTranslateY) {
    return (
      <>
        <DMCHeader
          eyebrow={eyebrow}
          title={title}
          compact
          onBack={onBack}
          onMenuPress={() => setShowMenu(true)}
          onRightPress={() => setShowNotifications(true)}
          badgeCount={pendingReports.length}
        />
        {modals}
      </>
    );
  }

  const badgeCount = pendingReports.length;

  return (
    <>
      <Animated.View style={[styles.headerOverlay, { transform: [{ translateY: headerTranslateY }] }]}>
        <DMCHeader eyebrow={eyebrow} title={title} compact hideIcons />
      </Animated.View>

      <View style={[styles.iconBarWrap, { height: iconBarHeight }]}>
        <DMCHeaderBackground compact height={headerHeight} />
        <View style={[styles.iconBarRow, { paddingTop: iconBarPaddingTop }]}>
          <TouchableOpacity style={styles.iconBarButton} activeOpacity={0.7} onPress={onBack ?? (() => setShowMenu(true))}>
            <Ionicons name={onBack ? 'chevron-back' : 'menu'} size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBarButton} activeOpacity={0.7} onPress={() => setShowNotifications(true)}>
            <Ionicons name="notifications-outline" size={18} color={Colors.white} />
            {badgeCount > 0 && (
              <View style={styles.iconBarBadge}>
                <Text style={styles.iconBarBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {modals}
    </>
  );
}

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconBarWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: Colors.gradientStart,
    overflow: 'hidden',
  },
  iconBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBarBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,30,28,0.25)',
  },
  menuPanel: {
    position: 'absolute',
    left: 16,
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 6,
  },
  notifPanel: {
    position: 'absolute',
    right: 16,
    width: 260,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  notifClear: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  notifEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingVertical: 8,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D68910',
  },
  notifText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textDark,
  },
  notifViewAll: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
  },
  notifViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
});
