import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Contact } from '@/context/night-mode';

// ── Storage keys ─────────────────────────────────────────────────────────────
const IDS_KEY = 'checkin_notification_ids';
const EMERGENCY_TIME_KEY = 'checkin_emergency_time';

// ── Notification category / action identifiers ────────────────────────────────
export const CHECK_IN_CATEGORY = 'CHECK_IN';
export const EMERGENCY_CATEGORY = 'EMERGENCY';
export const ACTION_HOME = 'HOME';
export const ACTION_EXTEND = 'EXTEND';
export const ACTION_SEND = 'SEND';

// ── One-time setup ────────────────────────────────────────────────────────────
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CHECK_IN_CATEGORY, [
    {
      identifier: ACTION_HOME,
      buttonTitle: "I'm home ✓",
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_EXTEND,
      buttonTitle: 'Extend 30 min',
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.setNotificationCategoryAsync(EMERGENCY_CATEGORY, [
    {
      identifier: ACTION_SEND,
      buttonTitle: 'Send location now',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule check-ins for a given homeByTime ─────────────────────────────────
export async function scheduleCheckIns(homeByTime: Date): Promise<void> {
  await cancelCheckIns();

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const now = new Date();
  const ids: string[] = [];

  const checkIns = [
    {
      offset: 0,
      title: 'Are you home yet? 🌙',
      body: "Your usual home time just passed. Tap to let us know you're safe.",
    },
    {
      offset: 5,
      title: "Still out? We're checking in 🌙",
      body: "5 minutes past your home time. Tap 'I'm home' or extend your time.",
    },
    {
      offset: 10,
      title: 'Last check-in 🌙',
      body: "10 minutes past your home time. Please respond or we'll notify your Safe Circle.",
    },
  ];

  for (const { offset, title, body } of checkIns) {
    const fireAt = new Date(homeByTime.getTime() + offset * 60_000);
    if (fireAt <= now) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        categoryIdentifier: CHECK_IN_CATEGORY,
        data: { type: 'checkin', offset },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    ids.push(id);
  }

  // Emergency notification at +15 min
  const emergencyAt = new Date(homeByTime.getTime() + 15 * 60_000);
  if (emergencyAt > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Notifying your Safe Circle',
        body: "No check-in received. Tap to send your location to your contacts now.",
        categoryIdentifier: EMERGENCY_CATEGORY,
        data: { type: 'emergency' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: emergencyAt,
      },
    });
    ids.push(id);
    await AsyncStorage.setItem(EMERGENCY_TIME_KEY, emergencyAt.toISOString());
  }

  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

// ── Cancel all scheduled check-ins ───────────────────────────────────────────
export async function cancelCheckIns(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    }
  } catch {}
  await AsyncStorage.multiRemove([IDS_KEY, EMERGENCY_TIME_KEY]);
}

// ── Extend check-ins by 30 minutes from now ───────────────────────────────────
export async function extendCheckIns(): Promise<void> {
  const newHomeTime = new Date(Date.now() + 30 * 60_000);
  await scheduleCheckIns(newHomeTime);
}

// ── Emergency state helpers ───────────────────────────────────────────────────
export async function isEmergencyPending(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_TIME_KEY);
    if (!raw) return false;
    return new Date() >= new Date(raw);
  } catch {
    return false;
  }
}

export async function clearEmergencyPending(): Promise<void> {
  await AsyncStorage.removeItem(EMERGENCY_TIME_KEY);
}

// ── Send emergency SMS to all Safe Circle contacts ────────────────────────────
export async function sendEmergencyMessages(contacts: Contact[]): Promise<void> {
  let locationText = 'my location (unable to retrieve)';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      locationText = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
    }
  } catch {}

  const message =
    `Hey, I was supposed to be home by now and my NightLight check-in timed out. ` +
    `Here's my location: ${locationText} — please check up on me.`;

  for (const contact of contacts) {
    const smsUrl =
      Platform.OS === 'ios'
        ? `sms:${contact.phone}&body=${encodeURIComponent(message)}`
        : `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(smsUrl);
    } catch {}
    // Give the SMS app a moment to open before the next contact
    await new Promise(r => setTimeout(r, 900));
  }
}
