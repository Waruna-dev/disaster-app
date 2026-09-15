import React from 'react';
import { Tabs } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../../constants/colors";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 10 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        let iconName = 'home-outline';
        if (route.name === 'index') iconName = isFocused ? 'home' : 'home-outline';
        if (route.name === 'alerts') iconName = isFocused ? 'notifications' : 'notifications-outline';
        if (route.name === 'map') iconName = isFocused ? 'map' : 'map-outline';
        if (route.name === 'reports') iconName = isFocused ? 'document-text' : 'document-text-outline';
        if (route.name === 'profile') iconName = isFocused ? 'person' : 'person-outline';

        if (route.name === 'map') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.mapButtonContainer}
              activeOpacity={0.8}
            >
              <View style={[styles.mapButton, isFocused && styles.mapButtonActive]}>
                <Ionicons name={iconName as any} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.mapLabel, isFocused && styles.mapLabelActive]}>Map</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName as any} size={24} color={isFocused ? Colors.primary : Colors.placeholder} />
            <Text style={[styles.tabLabel, { color: isFocused ? Colors.primary : Colors.placeholder }]}>
              {label === 'index' ? 'Home' : label.charAt(0).toUpperCase() + label.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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
  }
});
