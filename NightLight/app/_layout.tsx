import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

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
  const { setLogout, active, homeByTime, contacts } = useNightMode();
  const [showLoader, setShowLoader] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const handleLogout = () => {
    setOnboarded(false);
  };

  // One-time setup
  useEffect(() => {
    setLogout(handleLogout);
    setupNotificationCategories();
  }, []);

  // Schedule / cancel check-ins whenever active or homeByTime changes
  useEffect(() => {
    if (active && homeByTime) {
      scheduleCheckIns(homeByTime);
    } else {
      cancelCheckIns();
    }
  }, [active, homeByTime]);

  // Handle notification action button responses
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as { type?: string };

      if (actionId === ACTION_HOME || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (data?.type === 'checkin') {
          cancelCheckIns();
        } else if (data?.type === 'emergency') {
          clearEmergencyPending();
          setEmergencyVisible(true);
        }
      } else if (actionId === ACTION_EXTEND) {
        extendCheckIns();
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
        }}
        onSend={async () => {
          setEmergencyVisible(false);
          cancelCheckIns();
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
