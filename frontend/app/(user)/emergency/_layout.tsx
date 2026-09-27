import React from 'react';
import { Stack } from 'expo-router';
import { NearbyServicesProvider } from '../../../contexts/NearbyServicesContext';

export default function EmergencyLayout() {
  return (
    <NearbyServicesProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </NearbyServicesProvider>
  );
}
