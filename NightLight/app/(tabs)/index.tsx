import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 56; // container paddingHorizontal: 28 * 2

import { Palette } from '@/constants/theme';

const S = 3;
const TRACK_WIDTH = CARD_W;
const THUMB_SIZE = 44;
const MAX_DRAG = TRACK_WIDTH - THUMB_SIZE - 8;

// ── Star field ─────────────────────────────────────────────────────────────
// Size is skewed small — most are tiny glowing points, a few have visible spikes
const STAR_DATA = Array.from({ length: 130 }, () => {
  const t = Math.random();
  const size = 0.4 + Math.pow(t, 2.2) * 4; // power curve: most stars tiny
  return {
    x: Math.random() * SCREEN_W,
    y: Math.random() * SCREEN_H,
    size,
    group: Math.floor(Math.random() * 3) as 0 | 1 | 2,
    rotation: Math.random() * 45, // random spike orientation
    coreGlow: size * 1.4,
    spikeGlow: size * 0.5,
  };
});

function StarShape({ size, rotation, coreGlow, spikeGlow }: typeof STAR_DATA[0]) {
  const spikeLen = size * 2.8;
  const spikeW = Math.max(0.6, size * 0.14);
  const coreR = Math.max(1, size * 0.32);
  const spikeStyle = {
    position: 'absolute' as const,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: spikeGlow,
  };
  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      {/* Horizontal spike */}
      <View style={[spikeStyle, { left: -spikeLen, top: -spikeW / 2, width: spikeLen * 2, height: spikeW }]} />
      {/* Vertical spike */}
      <View style={[spikeStyle, { left: -spikeW / 2, top: -spikeLen, width: spikeW, height: spikeLen * 2 }]} />
      {/* Bright core */}
      <View style={{
        position: 'absolute',
        left: -coreR,
        top: -coreR,
        width: coreR * 2,
        height: coreR * 2,
        borderRadius: coreR,
        backgroundColor: '#ffffff',
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: coreGlow,
      }} />
    </View>
  );
}

function StarField() {
  const t0 = useRef(new Animated.Value(1.0)).current;
  const t1 = useRef(new Animated.Value(0.8)).current;
  const t2 = useRef(new Animated.Value(0.9)).current;
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    const loop = (val: Animated.Value, dur: number, min: number, max: number, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: min, duration: dur, useNativeDriver: true }),
        Animated.timing(val, { toValue: max, duration: dur, useNativeDriver: true }),
      ])).start();
    loop(t0, 2200, 0.55, 1.0, 0);
    loop(t1, 3100, 0.45, 1.0, 600);
    loop(t2, 1900, 0.65, 1.0, 1200);

    Accelerometer.setUpdateInterval(50);
    const sub = Accelerometer.addListener(({ x, y }) => {
      Animated.spring(offset, {
        toValue: { x: x * 18, y: -y * 18 },
        useNativeDriver: true,
        damping: 15,
        stiffness: 80,
      }).start();
    });
    return () => sub.remove();
  }, []);

  const anims = [t0, t1, t2];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: offset.getTranslateTransform() }]}>
        {STAR_DATA.map((star, i) => (
          <Animated.View
            key={i}
            style={{ position: 'absolute', left: star.x, top: star.y, opacity: anims[star.group] }}
          >
            <StarShape {...star} />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

// Weather code → label + icon
function weatherLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear', icon: '☀️' };
  if (code <= 3) return { label: 'Cloudy', icon: '☁️' };
  if (code <= 48) return { label: 'Foggy', icon: '🌫️' };
  if (code <= 55) return { label: 'Drizzle', icon: '🌦️' };
  if (code <= 65) return { label: 'Rain', icon: '🌧️' };
  if (code <= 75) return { label: 'Snow', icon: '❄️' };
  if (code <= 82) return { label: 'Showers', icon: '🌦️' };
  if (code <= 99) return { label: 'Thunder', icon: '⛈️' };
  return { label: '—', icon: '—' };
}

// Blend #69AFFF toward darker/lighter based on temp
function tempColor(tempC: number): string {
  const base = { r: 0x69, g: 0xAF, b: 0xFF };
  // cold = darker, hot = lighter
  const factor = Math.min(Math.max((tempC - 15) / 20, -1), 1); // -1 at ≤-5°C, +1 at ≥35°C
  const r = Math.round(base.r + factor * (factor > 0 ? (255 - base.r) * 0.35 : base.r * 0.45));
  const g = Math.round(base.g + factor * (factor > 0 ? (255 - base.g) * 0.35 : base.g * 0.45));
  const b = Math.round(base.b + factor * (factor > 0 ? (255 - base.b) * 0.35 : base.b * 0.45));
  return `rgb(${r},${g},${b})`;
}

function GlowText({ text, style }: { text: string; style: object }) {
  const outline = { color: Palette.amber };
  const offsets = [
    { width: -S, height: -S }, { width: 0, height: -S }, { width: S, height: -S },
    { width: -S, height: 0 },                             { width: S, height: 0 },
    { width: -S, height: S  }, { width: 0, height: S  }, { width: S, height: S  },
  ];
  return (
    <View>
      {offsets.map((offset, i) => (
        <Text key={i} style={[style, outline, { textShadowColor: Palette.amber, textShadowOffset: offset, textShadowRadius: 1, position: i === 0 ? undefined : 'absolute' }]}>{text}</Text>
      ))}
      <Text style={[style, {
        color: '#fcfbff',
        position: 'absolute',
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 2, height: 3 },
        textShadowRadius: 6,
      }]}>{text}</Text>
    </View>
  );
}

function SlideBar() {
  const x = useRef(new Animated.Value(0)).current;
  const lastX = useRef(0);
  const maxDragRef = useRef(1);
  const lockedRef = useRef(false);
  const [maxDrag, setMaxDrag] = useState(1);
  const [locked, setLocked] = useState(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !lockedRef.current,
    onMoveShouldSetPanResponder: () => !lockedRef.current,
    onPanResponderMove: (_, g) => {
      if (lockedRef.current) return;
      x.setValue(Math.min(Math.max(0, lastX.current + g.dx), maxDragRef.current));
    },
    onPanResponderRelease: (_, g) => {
      if (lockedRef.current) return;
      const next = Math.min(Math.max(0, lastX.current + g.dx), maxDragRef.current);
      if (next >= maxDragRef.current * 0.4) {
        Animated.spring(x, { toValue: maxDragRef.current, useNativeDriver: false }).start();
        lastX.current = maxDragRef.current;
        lockedRef.current = true;
        setLocked(true);
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        lastX.current = 0;
      }
    },
  })).current;

  const onTrackLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const drag = e.nativeEvent.layout.width - THUMB_SIZE - 8;
    maxDragRef.current = drag;
    setMaxDrag(drag);
  };

  return (
    <View style={slider.wrapper}>
      <Text style={slider.label}>{locked ? 'See you out there!' : 'Going out?'}</Text>
      <View style={slider.track} onLayout={onTrackLayout}>
        <Animated.View style={[slider.fill, { width: x.interpolate({ inputRange: [0, maxDrag], outputRange: [THUMB_SIZE + 8, TRACK_WIDTH + 6], extrapolate: 'clamp' }) }]} />
        <Animated.View style={[slider.thumb, locked && slider.thumbLocked, { transform: [{ translateX: x }] }]} {...panResponder.panHandlers} />
      </View>
    </View>
  );
}

interface Weather {
  temp: number;
  code: number;
}

function whatToWear(tempC: number, code: number): string {
  const rain = code >= 51 && code <= 82;
  const snow = code >= 71 && code <= 75;
  const thunder = code >= 95;
  if (snow) return 'Heavy coat, boots, and layers. It\'s snowing out there.';
  if (thunder) return 'Stay in if you can. If not, waterproof jacket and closed shoes.';
  if (rain) return 'Bring an umbrella. A light rain jacket works well.';
  if (tempC <= 0) return 'Bundle up — coat, scarf, gloves. It\'s freezing.';
  if (tempC <= 10) return 'A warm jacket and maybe a light layer underneath.';
  if (tempC <= 16) return 'Light jacket or a hoodie should do it.';
  if (tempC <= 22) return 'A light layer or long sleeves. Pretty comfortable out.';
  if (tempC <= 28) return 'T-shirt weather. Maybe bring a light layer for later.';
  return 'It\'s hot. Keep it light — shorts and a tee.';
}

function WeatherWidget({ font, height }: { font: string; height?: number }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flip = () => {
    const toValue = flipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, useNativeDriver: true, friction: 8 }).start();
    setFlipped(f => !f);
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0.4, 0.5], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0.4, 0.5], outputRange: [0, 1] });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setError(true); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const { latitude, longitude } = loc.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        );
        const json = await res.json();
        setWeather({ temp: Math.round(json.current.temperature_2m), code: json.current.weather_code });
      } catch {
        setError(true);
      }
    })();
  }, []);

  if (error) return null;

  const tempC = weather ? (weather.temp - 32) * 5 / 9 : 15;
  const mid = tempColor(tempC);
  const darker = tempColor(tempC - 22);
  const lightest = tempColor(tempC + 14);
  const { label, icon } = weather ? weatherLabel(weather.code) : { label: '...', icon: '' };
  const displayTemp = weather
    ? useFahrenheit ? `${weather.temp}°` : `${Math.round(tempC)}°`
    : '—';
  const unit = useFahrenheit ? 'F' : 'C';

  const sizeStyle = height ? { height, width: height } : undefined;

  return (
    <Pressable onPress={flip}>
      <View style={[wx.shadow, sizeStyle]}>
        {/* Front */}
        <Animated.View style={[wx.face, sizeStyle, { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] }]}>
          <LinearGradient colors={[darker, mid, lightest]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[wx.card, sizeStyle]}>
            <View style={wx.inner}>
              <Text style={wx.icon}>{icon}</Text>
              <View style={wx.tempRow}>
                <Text style={[wx.temp, { fontFamily: font }]}>{displayTemp}</Text>
                <Text onPress={e => { e.stopPropagation(); setUseFahrenheit(f => !f); }} style={[wx.unit, { fontFamily: font }]}>{unit}</Text>
              </View>
              <Text style={[wx.label, { fontFamily: font }]}>{label}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[wx.face, wx.faceBack, sizeStyle, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
          <LinearGradient colors={[darker, mid, lightest]} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={[wx.card, sizeStyle]}>
            <View style={wx.inner}>
              <Text style={[wx.wearTitle, { fontFamily: font }]}>What to wear</Text>
              <Text style={[wx.wearText, { fontFamily: font }]}>
                {weather ? whatToWear(tempC, weather.code) : '...'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    CoreBandi: require('@/assets/fonts/CoreBandi.ttf'),
    Archive: require('@/assets/fonts/Archive.ttf'),
    ArchiveBold: require('@/assets/fonts/ArchiveBold.ttf'),
  });

  const [time, setTime] = useState({ clock: '', period: '' });
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = now.getMinutes().toString().padStart(2, '0');
      const period = now.getHours() >= 12 ? 'PM' : 'AM';
      setTime({ clock: `${h}:${m}`, period });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StarField />
      <View style={styles.cardShadow} onLayout={e => setCardHeight(e.nativeEvent.layout.height)}>
        <LinearGradient
          colors={['#f0b83a', Palette.amber, '#fcc95a', '#f0b535']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.timeWrapper}>
            <GlowText text={time.clock} style={styles.time} />
            <GlowText text={time.period} style={styles.period} />
          </View>
        </LinearGradient>
      </View>
      <View style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: 'Archive', fontSize: 18, color: '#fcfbff', letterSpacing: 1, marginBottom: 10, marginTop: 28 }}>Another great day!</Text>
        <WeatherWidget font="Archive" height={cardHeight} />
      </View>
      <SlideBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 28,
  },
  cardShadow: {
    alignSelf: 'stretch',
    borderRadius: 28,
    shadowColor: Palette.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  card: {
    backgroundColor: Palette.amber,
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  timeWrapper: {
    alignItems: 'center',
  },
  time: {
    fontFamily: 'Archive',
    fontSize: 80,
    color: '#fcfbff',
    letterSpacing: 4,
  },
  period: {
    fontFamily: 'Archive',
    fontSize: 22,
    color: '#fcfbff',
    letterSpacing: 6,
    marginTop: -8,
  },
});

const wx = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'flex-start',
    shadowColor: '#69AFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  faceBack: {
    // sits on top when flipped
  },
  card: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 34,
    marginBottom: 2,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  temp: {
    fontSize: 48,
    color: '#fcfbff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  unit: {
    fontSize: 20,
    color: '#fcfbff',
    opacity: 0.85,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#fcfbff',
    letterSpacing: 1,
    opacity: 0.8,
    marginTop: 2,
  },
  wearTitle: {
    fontSize: 13,
    color: '#fcfbff',
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 8,
  },
  wearText: {
    fontSize: 15,
    color: '#fcfbff',
    textAlign: 'center',
    lineHeight: 22,
  },
});

const slider = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  label: {
    color: '#fcfbff',
    fontSize: 18,
    fontFamily: 'Archive',
    letterSpacing: 1,
  },
  track: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE + 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: Palette.blush,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Palette.blush,
    opacity: 0.25,
    borderRadius: 10,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE + 12,
    borderRadius: 10,
    backgroundColor: Palette.blush,
    marginLeft: 4,
    shadowColor: Palette.blush,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  thumbLocked: {
    opacity: 0.5,
  },
});
