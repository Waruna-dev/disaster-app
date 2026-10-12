import { Platform } from 'react-native';

const CHANNEL_ID = 'hazard-alerts';

// Load expo-notifications safely. In Expo Go (Android, SDK 53+) merely importing it
// throws, so we catch that and simply disable notifications instead of crashing.
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

let ready = false;

// Call once when the dashboard opens: asks permission + creates the Android channel.
export async function setupAlertNotifications(): Promise<void> {
  if (!Notifications || ready) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Hazard alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        sound: 'default',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    ready = true;
  } catch (e) {
    console.log('setupAlertNotifications error:', e);
  }
}

// Shows a system notification right now (used when the app is in the background).
export async function showAlertNotification(title: string, body: string): Promise<void> {
  if (!Notifications) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${title}`,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null, // null = show immediately
    });
  } catch (e) {
    console.log('showAlertNotification error:', e);
  }
}