import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

type DMCTab = 'home' | 'incidents' | 'map' | 'analytics' | 'reports';

interface TabConfig {
  key: DMCTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route?: string;
}

// Analytics has no screen yet (out of scope here) — tapping it says so instead of
// navigating to a dead or fake route.
const TABS: TabConfig[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/(DMC)/dashboard' },
  { key: 'incidents', label: 'Incidents', icon: 'document-text-outline', activeIcon: 'document-text', route: '/(DMC)/incidents' },
  { key: 'map', label: 'Map', icon: 'location-outline', activeIcon: 'location', route: '/(DMC)/map' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'reports', label: 'All Reports', icon: 'albums-outline', activeIcon: 'albums', route: '/(DMC)/reports' },
];

// Same raised-center-button look as the resident tab bar (app/(user)/(tabs)/_layout.tsx's
// CustomTabBar) — reimplemented standalone since the admin screens sit in a plain Stack,
// not a Tabs navigator, so the resident component's {state, descriptors, navigation} props
// aren't available here.
export function DMCTabBar({ active }: { active: DMCTab }) {
  const insets = useSafeAreaInsets();

  const handlePress = (tab: TabConfig) => {
    if (tab.route) {
      router.push(tab.route as any);
    } else {
      Alert.alert('Coming soon', `${tab.label} isn't built yet.`);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 10 }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;

        if (tab.key === 'map') {
          return (
            <TouchableOpacity key={tab.key} onPress={() => handlePress(tab)} style={styles.mapButtonContainer} activeOpacity={0.8}>
              <View style={[styles.mapButton, isActive && styles.mapButtonActive]}>
                <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.mapLabel, isActive && styles.mapLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.key} onPress={() => handlePress(tab)} style={styles.tabItem} activeOpacity={0.7}>
            <Ionicons name={isActive ? tab.activeIcon : tab.icon} size={24} color={isActive ? Colors.primary : Colors.placeholder} />
            <Text style={[styles.tabLabel, { color: isActive ? Colors.primary : Colors.placeholder }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
    paddingTop: 8,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  mapButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  mapButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -26,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  mapButtonActive: {
    backgroundColor: '#07614e',
  },
  mapLabel: {
    fontSize: 10,
    marginTop: 38,
    fontWeight: '700',
    color: Colors.primary,
  },
  mapLabelActive: {
    color: '#07614e',
  },
});
