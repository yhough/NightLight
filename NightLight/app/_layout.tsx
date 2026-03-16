import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';

import LoadingScreen from '@/components/loading-screen';
import OnboardingFlow from '@/components/onboarding-flow';
import MessageQueue from '@/components/message-queue';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NightModeProvider, useNightMode } from '@/context/night-mode';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppShell() {
  const colorScheme = useColorScheme();
  const { setLogout } = useNightMode();
  const [showLoader, setShowLoader] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  // Queue modal – opened by the nightlight://queue deep link
  const [queueOpen, setQueueOpen] = useState(false);

  const handleLogout = () => {
    setOnboarded(false);
  };

  useEffect(() => {
    setLogout(handleLogout);
  }, []);

  // ── Deep link handler ────────────────────────────────────────────────────
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
    // Handle URL that launched the app
    Linking.getInitialURL().then(handleUrl);

    // Handle URLs while the app is already open
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
