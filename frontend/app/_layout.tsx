import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import '../i18n'; // Import i18n configuration

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(user)" />
          <Stack.Screen name="(DMC)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
