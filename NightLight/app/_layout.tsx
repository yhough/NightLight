import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import LoadingScreen from '@/components/loading-screen';
import SignInScreen from '@/components/sign-in-screen';
import OnboardingFlow from '@/components/onboarding-flow';
import ImpulseFirewall from '@/components/impulse-firewall';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NightModeProvider, useNightMode } from '@/context/night-mode';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppShell() {
  const colorScheme = useColorScheme();
  const { setLogout } = useNightMode();
  const [showLoader, setShowLoader] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const handleLogout = () => {
    setSignedIn(false);
    setOnboarded(false);
  };

  useEffect(() => {
    setLogout(handleLogout);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      {showLoader && <LoadingScreen onFinish={() => setShowLoader(false)} />}
      {!showLoader && !signedIn && <SignInScreen onSignIn={() => setSignedIn(true)} />}
      {!showLoader && signedIn && !onboarded && <OnboardingFlow onComplete={() => setOnboarded(true)} />}
      <ImpulseFirewall />
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
