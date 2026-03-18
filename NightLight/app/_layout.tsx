import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

import LoadingScreen from '@/components/loading-screen';
import OnboardingFlow from '@/components/onboarding-flow';
import MessageQueue from '@/components/message-queue';
import EmergencyModal from '@/components/emergency-modal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NightModeProvider, useNightMode } from '@/context/night-mode';
import {
  setupNotificationCategories,
  scheduleCheckIns,
  cancelCheckIns,
  extendCheckIns,
  isEmergencyPending,
  clearEmergencyPending,
  sendEmergencyMessages,
  ACTION_HOME,
  ACTION_EXTEND,
  ACTION_SEND,
} from '@/utils/check-in';
import { createSession, recordSafe, recordExtend, endSession } from '@/utils/api';

// Show notifications as banners even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppShell() {
  const colorScheme = useColorScheme();
  const { setLogout, active, setActive, homeByTime, homeCoords, contacts } = useNightMode();
  const [showLoader, setShowLoader] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Track the live backend session ID so notification handlers can reference it
  const sessionIdRef = useRef<string | null>(null);
  // Keep a live ref to contacts so the session effect doesn't stale-close over them
  const contactsRef = useRef(contacts);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  const handleLogout = () => {
    setOnboarded(false);
  };

  // One-time setup
  useEffect(() => {
    setLogout(handleLogout);
    setupNotificationCategories();
  }, []);

  // Schedule / cancel check-ins and sync with backend whenever active or homeByTime changes
  useEffect(() => {
    if (active && homeByTime) {
      scheduleCheckIns(homeByTime);

      // Create a backend session — runs in parallel with local notifications.
      // If the backend is unreachable, local notifications still work normally.
      createSession({
        homeByTime,
        contacts: contactsRef.current.map(c => ({ name: c.name, phone: c.phone })),
      })
        .then(({ sessionId }) => {
          sessionIdRef.current = sessionId;
          console.log(`[NightLight] Backend session created: ${sessionId}`);
        })
        .catch(err => {
          console.warn('[NightLight] Backend session creation failed (SMS escalation disabled):', err.message);
        });
    } else {
      cancelCheckIns();

      // End the backend session if one exists
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current).catch(() => {});
        sessionIdRef.current = null;
      }
    }
  }, [active, homeByTime]);

  // Auto-deactivate once homeByTime has passed AND the user is near home
  useEffect(() => {
    if (!active || !homeByTime || !homeCoords) return;

    const HOME_RADIUS_M = 150;

    const checkLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const dist = haversineMeters(
          loc.coords.latitude, loc.coords.longitude,
          homeCoords.latitude, homeCoords.longitude,
        );
        if (dist <= HOME_RADIUS_M) {
          setActive(false);
        }
      } catch {
        // location unavailable — keep session running
      }
    };

    const msRemaining = homeByTime.getTime() - Date.now();

    // Wait until homeByTime, then start polling every 60 s until home
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const onTimeReached = () => {
      checkLocation();
      pollInterval = setInterval(checkLocation, 60_000);
    };

    let kickoffTimer: ReturnType<typeof setTimeout> | null = null;
    if (msRemaining <= 0) {
      onTimeReached();
    } else {
      kickoffTimer = setTimeout(onTimeReached, msRemaining);
    }

    return () => {
      if (kickoffTimer) clearTimeout(kickoffTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [active, homeByTime, homeCoords]);

  // Handle notification action button responses
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as { type?: string };

      if (actionId === ACTION_HOME || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (data?.type === 'checkin') {
          cancelCheckIns();
          // Tell backend the user is safe — cancels SMS timers
          if (sessionIdRef.current) {
            recordSafe(sessionIdRef.current).catch(() => {});
            sessionIdRef.current = null;
          }
        } else if (data?.type === 'emergency') {
          clearEmergencyPending();
          setEmergencyVisible(true);
        }
      } else if (actionId === ACTION_EXTEND) {
        extendCheckIns();
        // Tell backend to reschedule its escalation +30 min
        if (sessionIdRef.current) {
          recordExtend(sessionIdRef.current).catch(() => {});
        }
      } else if (actionId === ACTION_SEND) {
        clearEmergencyPending();
        setEmergencyVisible(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Check for a missed emergency when the app comes to the foreground
  useEffect(() => {
    const check = async () => {
      if (!active) return;
      if (await isEmergencyPending()) {
        await clearEmergencyPending();
        setEmergencyVisible(true);
      }
    };

    check();

    const sub = AppState.addEventListener('change', next => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        check();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [active]);

  // Deep link handler
  const handleUrl = (url: string | null) => {
    if (!url) return;
    try {
      const parsed = Linking.parse(url);
      if (parsed.scheme === 'nightlight' && parsed.hostname === 'queue') {
        setQueueOpen(true);
      }
    } catch {
      // ignore malformed URLs
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      {showLoader && <LoadingScreen onFinish={() => setShowLoader(false)} />}
      {!showLoader && !onboarded && <OnboardingFlow onComplete={() => setOnboarded(true)} />}
      {/* Queue modal – triggered by nightlight://queue deep link */}
      <MessageQueue visible={queueOpen} onClose={() => setQueueOpen(false)} />
      <EmergencyModal
        visible={emergencyVisible}
        contacts={contacts}
        onDismiss={() => {
          setEmergencyVisible(false);
          cancelCheckIns();
          if (sessionIdRef.current) {
            endSession(sessionIdRef.current).catch(() => {});
            sessionIdRef.current = null;
          }
        }}
        onSend={async () => {
          setEmergencyVisible(false);
          cancelCheckIns();
          if (sessionIdRef.current) {
            endSession(sessionIdRef.current).catch(() => {});
            sessionIdRef.current = null;
          }
          await sendEmergencyMessages(contacts);
        }}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <NightModeProvider>
      <AppShell />
    </NightModeProvider>
  );
}
