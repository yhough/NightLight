import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNightMode } from '@/context/night-mode';

const COUNTDOWN = 10;

const C = {
  bg: 'rgba(13,13,13,0.97)',
  gold: '#E8B030',
  goldBright: '#F5C842',
  goldDim: 'rgba(232,176,48,0.13)',
  goldBorder: 'rgba(232,176,48,0.25)',
  pink: '#E8558A',
  pinkBright: '#F472B6',
  pinkDim: 'rgba(232,85,138,0.13)',
  pinkBorder: 'rgba(232,85,138,0.25)',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)',
};

export default function ImpulseFirewall() {
  const { active, impulseEnabled } = useNightMode();
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fontsLoaded] = useFonts({
    Archive: require('@/assets/fonts/Archive.ttf'),
  });

  const show = () => {
    setSeconds(COUNTDOWN);
    setVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const dismiss = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setVisible(false)
    );
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Countdown timer while visible
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          dismiss();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible]);

  // Trigger on foreground return
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (active && impulseEnabled) show();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [active, impulseEnabled]);

  if (!visible || !fontsLoaded) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
      <View style={s.card}>
        <Text style={[s.emoji]}>💬</Text>
        <Text style={[s.headline, { fontFamily: 'Archive' }]}>
          Hold that thought.
        </Text>
        <Text style={[s.body, { fontFamily: 'Archive' }]}>
          Impulse Firewall is active.{'\n'}Give it a second before you hit send.
        </Text>

        <View style={s.countdownRow}>
          <Text style={[s.countdownLabel, { fontFamily: 'Archive' }]}>closing in</Text>
          <Text style={[s.countdownNum, { fontFamily: 'Archive' }]}>{seconds}s</Text>
        </View>

        <Pressable onPress={dismiss} style={s.btn}>
          <Text style={[s.btnText, { fontFamily: 'Archive' }]}>I'll think twice</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  headline: {
    fontSize: 30,
    color: C.white,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: C.pink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  body: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  countdownLabel: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1.5,
  },
  countdownNum: {
    fontSize: 28,
    color: C.pinkBright,
    letterSpacing: 0,
  },
  btn: {
    alignSelf: 'stretch',
    height: 54,
    backgroundColor: C.pinkDim,
    borderWidth: 1,
    borderColor: C.pinkBorder,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: {
    fontSize: 15,
    color: C.pinkBright,
    letterSpacing: 1,
  },
});
