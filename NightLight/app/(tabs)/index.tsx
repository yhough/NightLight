import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BUTTON_SIZE = 176;
const HOLD_MS = 1500;

const C = {
  bg0: '#07071A',
  bg1: '#120D2C',
  violet: '#8B5CF6',
  violetBright: '#A78BFA',
  violetDim: 'rgba(139,92,246,0.18)',
  violetGlass: 'rgba(139,92,246,0.08)',
  emerald: '#10B981',
  emeraldBright: '#34D399',
  emeraldDim: 'rgba(16,185,129,0.18)',
  white: '#FFFFFF',
  text: '#EDE9FE',
  muted: 'rgba(237,233,254,0.4)',
  border: 'rgba(139,92,246,0.22)',
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

  const onPressIn = () => {
    if (active) return;
    didComplete.current = false;
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
    holdAnim.current = Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        didComplete.current = true;
        onActivate();
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }
    });
  };

  const onPressOut = () => {
    if (active) {
      onDeactivate();
      Animated.timing(fill, { toValue: 0, duration: 500, useNativeDriver: false }).start();
      return;
    }
    if (!didComplete.current) {
      holdAnim.current?.stop();
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(fill, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]).start();
    }
  };

  const accentColor = active ? C.emerald : C.violet;
  const accentBright = active ? C.emeraldBright : C.violetBright;
  const glowBg = active ? C.emeraldDim : C.violetDim;

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BUTTON_SIZE],
  });
  const borderW = fill.interpolate({ inputRange: [0, 1], outputRange: [1.5, 3] });

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
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
            <Text style={[btn.mainLabel, { color: accentBright, fontFamily: font }]}>
              {active ? 'ACTIVE' : 'HOLD'}
            </Text>
            <Text
              style={[
                btn.subLabel,
                {
                  color: active ? 'rgba(52,211,153,0.55)' : C.muted,
                  fontFamily: font,
                },
              ]}
            >
              {active ? 'tap to end' : 'to go live'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
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
  const [active, setActive] = useState(false);

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
        <Text style={[sc.clock, { fontFamily: 'Archive' }]}>{time.clock}</Text>
        <Text style={[sc.period, { fontFamily: 'Archive' }]}>{time.period}</Text>
        <Text style={[sc.date, { fontFamily: 'Archive' }]}>{dateStr}</Text>
      </View>

      {/* Divider */}
      <View style={sc.divider} />

      {/* Prompt */}
      <Text style={[sc.prompt, { fontFamily: 'Archive' }]}>
        {active ? 'Your crew has you covered.' : 'Ready to head out?'}
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
    </LinearGradient>
  );
}

// ── StyleSheets ───────────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 88,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  top: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 52,
  },
  timeBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  clock: {
    fontSize: 90,
    color: C.white,
    letterSpacing: -2,
    lineHeight: 90,
    textShadowColor: C.violet,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  period: {
    fontSize: 16,
    color: C.muted,
    letterSpacing: 6,
    marginTop: 4,
  },
  date: {
    fontSize: 13,
    color: C.muted,
    letterSpacing: 1,
    marginTop: 10,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: C.border,
    marginBottom: 28,
  },
  prompt: {
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.4,
    marginBottom: 56,
    marginTop: -16,
    opacity: 0.8,
  },
  hint: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.3,
    marginTop: 84,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7,
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
    backgroundColor: 'rgba(255,255,255,0.025)',
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
    fontSize: 19,
    letterSpacing: 4,
  },
  subLabel: {
    fontSize: 11,
    letterSpacing: 2,
  },
});
