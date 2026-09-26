import React from 'react';
import { Stack } from 'expo-router';
import { FloodUpdatesProvider } from '../../context/FloodUpdatesContext';

export default function UserLayout() {
  return (
    <FloodUpdatesProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </FloodUpdatesProvider>
  );
}
