import { useFonts } from 'expo-font';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNightMode } from '@/context/night-mode';
import {
  AppState,
  AppStateStatus,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import MessageQueue from '@/components/message-queue';

// Lazy-load the native bridge so the app doesn't crash on web / Expo Go
let QueueBridge: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QueueBridge = require('@/modules/queue-bridge').default;
} catch {
  // Not available in this environment
}

const BUTTON_SIZE = 176;
const HOLD_MS = 1500;

const C = {
  bg0: '#0D0D0D',
  bg1: '#0D0D0D',
  violet: '#E8B030',
  violetBright: '#F5C842',
  violetDim: 'rgba(232,176,48,0.18)',
  violetGlass: 'rgba(232,176,48,0.08)',
  emerald: '#E8558A',
  emeraldBright: '#F472B6',
  emeraldDim: 'rgba(232,85,138,0.18)',
  white: '#FFFFFF',
  text: '#EDE9FE',
  muted: 'rgba(255,255,255,0.65)',
  border: 'rgba(232,176,48,0.22)',
  borderFaint: 'rgba(255,255,255,0.07)',
};

// ── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ active, font }: { active: boolean; font: string }) {
  return (
    <View
      style={[
        sp.pill,
        {
          backgroundColor: active ? C.emeraldDim : 'rgba(255,255,255,0.04)',
          borderColor: active ? 'rgba(16,185,129,0.35)' : C.borderFaint,
        },
      ]}
    >
      <View style={[sp.dot, { backgroundColor: active ? C.emerald : C.muted }]} />
      <Text style={[sp.label, { color: active ? C.emeraldBright : C.muted, fontFamily: font }]}>
        {active ? 'NIGHT MODE ACTIVE' : 'NIGHT MODE OFF'}
      </Text>
    </View>
  );
}

// ── ActivateButton ────────────────────────────────────────────────────────────
function ActivateButton({
  active,
  font,
  onActivate,
  onDeactivate,
}: {
  active: boolean;
  font: string;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const didComplete = useRef(false);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.18,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.0,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
        glowScale.setValue(1);
      };
    }
  }, [active]);

  const handleGrant = () => {
    didComplete.current = false;
    const toValue = activeRef.current ? 0 : 1;
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
    holdAnim.current = Animated.timing(fill, {
      toValue,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        didComplete.current = true;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeRef.current) {
          activeRef.current = false;
          onDeactivate();
        } else {
          activeRef.current = true;
          onActivate();
        }
      }
    });
  };

  const handleRelease = () => {
    if (didComplete.current) {
      return;
    }
    holdAnim.current?.stop();
    const resetTo = activeRef.current ? 1 : 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(fill, { toValue: resetTo, duration: 350, useNativeDriver: false }),
    ]).start();
  };

  const handleGrantRef = useRef(handleGrant);
  handleGrantRef.current = handleGrant;
  const handleReleaseRef = useRef(handleRelease);
  handleReleaseRef.current = handleRelease;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => handleGrantRef.current(),
      onPanResponderRelease: () => handleReleaseRef.current(),
      onPanResponderTerminate: () => handleReleaseRef.current(),
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const accentColor = active ? C.emerald : C.violet;
  const glowBg = active ? C.emeraldDim : C.violetDim;

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BUTTON_SIZE],
  });
  const borderW = fill.interpolate({ inputRange: [0, 1], outputRange: [1.5, 3] });

  return (
    <Animated.View style={{ transform: [{ scale }] }} {...panResponder.panHandlers}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            btn.glow,
            { backgroundColor: glowBg, transform: [{ scale: glowScale }] },
          ]}
        />
        {/* Circle */}
        <Animated.View
          style={[
            btn.circle,
            {
              borderColor: accentColor,
              borderWidth: borderW,
              shadowColor: accentColor,
            },
          ]}
        >
          {/* Fill from bottom */}
          <Animated.View
            style={[
              btn.fill,
              {
                height: fillHeight,
                backgroundColor: active
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(139,92,246,0.1)',
              },
            ]}
          />
          {/* Labels */}
          <View style={btn.labels}>
            <Text style={[btn.mainLabel, { fontFamily: font }]}>
              {active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
            <Text
              style={[
                btn.subLabel,
                {
                  color: active ? 'rgba(232,85,138,0.7)' : C.muted,
                  fontFamily: font,
                },
              ]}
            >
              {active ? 'hold to end' : 'hold to go live'}
            </Text>
          </View>
        </Animated.View>
    </Animated.View>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    LilitaOne: require('@/assets/fonts/LilitaOne.ttf'),
    Archive: require('@/assets/fonts/Archive.ttf'),
  });

  const [time, setTime] = useState({ clock: '', period: '' });
  const [dateStr, setDateStr] = useState('');
  const { active, setActive } = useNightMode();

  // ── Queue state ────────────────────────────────────────────────────────────
  const [queueCount, setQueueCount] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const refreshQueueCount = useCallback(async () => {
    if (!QueueBridge) return;
    try {
      const items = await QueueBridge.getQueueItems();
      setQueueCount(Array.isArray(items) ? items.length : 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshQueueCount();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && state === 'active') {
        refreshQueueCount();
      }
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [refreshQueueCount]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes().toString().padStart(2, '0');
      const period = now.getHours() >= 12 ? 'PM' : 'AM';
      const day = now.toLocaleDateString('en-US', { weekday: 'long' });
      const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      setTime({ clock: `${h}:${m}`, period });
      setDateStr(`${day}, ${date}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg0 }} />;
  }

  return (
    <LinearGradient
      colors={[C.bg0, C.bg1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={sc.container}
    >
      {/* Status */}
      <View style={sc.top}>
        <StatusPill active={active} font="Archive" />
      </View>

      {/* Time */}
      <View style={sc.timeBlock}>
        <Text style={[sc.clock, { fontFamily: 'Archive', textShadowColor: active ? '#E8558A' : '#E8B030' }]}>{time.clock}</Text>
        <Text style={[sc.period, { fontFamily: 'Archive' }]}>{time.period}</Text>
        <Text style={[sc.date, { fontFamily: 'Archive' }]}>{dateStr}</Text>
      </View>

      {/* Divider */}
      <View style={sc.divider} />

      {/* Prompt */}
      <Text style={[sc.prompt, { fontFamily: 'Archive' }]}>
        {active ? 'Have a great night!' : 'Ready to head out?'}
      </Text>

      {/* Activation button */}
      <ActivateButton
        active={active}
        font="Archive"
        onActivate={() => setActive(true)}
        onDeactivate={() => setActive(false)}
      />

      {/* Hint */}
      <Text style={[sc.hint, { fontFamily: 'Archive' }]}>
        {active
          ? 'NightLight is monitoring your session.'
          : 'Hold for 1.5 seconds to activate night mode.'}
      </Text>

      {/* Queue badge */}
      {queueCount > 0 && (
        <Pressable
          style={sc.queueBadge}
          onPress={() => setQueueOpen(true)}
        >
          <View style={sc.queueDot} />
          <Text style={[sc.queueText, { fontFamily: 'Archive' }]}>
            {queueCount} message{queueCount !== 1 ? 's' : ''} waiting
          </Text>
          <Text style={sc.queueChevron}>›</Text>
        </Pressable>
      )}

      {/* Queue modal */}
      <MessageQueue
        visible={queueOpen}
        onClose={() => {
          setQueueOpen(false);
          refreshQueueCount();
        }}
      />

    </LinearGradient>
  );
}

// ── StyleSheets ───────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  top: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 28,
  },
  timeBlock: {
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'visible',
  },
  clock: {
    fontSize: 108,
    color: C.white,
    letterSpacing: -2,
    lineHeight: 108,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  period: {
    fontSize: 22,
    color: C.muted,
    letterSpacing: 6,
    marginTop: -16,
  },
  date: {
    fontSize: 16,
    color: C.muted,
    letterSpacing: 1,
    marginTop: -2,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: C.border,
    marginBottom: 28,
  },
  prompt: {
    fontSize: 20,
    color: C.white,
    letterSpacing: 0.4,
    marginBottom: 72,
    marginTop: -6,
  },
  hint: {
    fontSize: 15,
    color: C.muted,
    letterSpacing: 0.3,
    marginTop: 64,
    textAlign: 'center',
    lineHeight: 22,
  },
  queueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(232,176,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,176,48,0.22)',
  },
  queueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.violet,
  },
  queueText: {
    fontSize: 13,
    color: C.violet,
    letterSpacing: 0.5,
  },
  queueChevron: {
    fontSize: 18,
    color: C.violetBright,
    marginLeft: 2,
    lineHeight: 20,
  },
});

const sp = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.8,
  },
});

const btn = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: BUTTON_SIZE + 64,
    height: BUTTON_SIZE + 64,
    borderRadius: (BUTTON_SIZE + 64) / 2,
    top: -32,
    left: -32,
  },
  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 14,
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  labels: {
    alignItems: 'center',
    gap: 6,
  },
  mainLabel: {
    fontSize: 20,
    letterSpacing: 4,
    color: C.white,
  },
  subLabel: {
    fontSize: 13,
    letterSpacing: 2,
  },
});
