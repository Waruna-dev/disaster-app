import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import '../i18n'; // Import i18n configuration

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(user)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AuthProvider>
  );
}
