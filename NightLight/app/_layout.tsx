import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import LoadingScreen from '@/components/loading-screen';
import SignInScreen from '@/components/sign-in-screen';
import OnboardingFlow from '@/components/onboarding-flow';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NightModeProvider } from '@/context/night-mode';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showLoader, setShowLoader] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  return (
    <NightModeProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      {showLoader && <LoadingScreen onFinish={() => setShowLoader(false)} />}
      {!showLoader && !signedIn && <SignInScreen onSignIn={() => setSignedIn(true)} />}
      {!showLoader && signedIn && !onboarded && <OnboardingFlow onComplete={() => setOnboarded(true)} />}
    </ThemeProvider>
    </NightModeProvider>
  );
}
