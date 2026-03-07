import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 56; // container paddingHorizontal: 28 * 2

import { Palette } from '@/constants/theme';

const S = 3;
const TRACK_WIDTH = 280;
const THUMB_SIZE = 44;
const MAX_DRAG = TRACK_WIDTH - THUMB_SIZE - 8;

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

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const next = Math.min(Math.max(0, lastX.current + g.dx), MAX_DRAG);
      x.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      const next = Math.min(Math.max(0, lastX.current + g.dx), MAX_DRAG);
      if (next >= MAX_DRAG * 0.85) {
        Animated.spring(x, { toValue: MAX_DRAG, useNativeDriver: false }).start();
        lastX.current = MAX_DRAG;
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        lastX.current = 0;
      }
    },
  })).current;

  const fillWidth = x.interpolate({ inputRange: [0, MAX_DRAG], outputRange: [THUMB_SIZE + 8, TRACK_WIDTH] });

  return (
    <View style={slider.wrapper}>
      <Text style={slider.label}>Going out?</Text>
      <View style={slider.track}>
        <Animated.View style={[slider.fill, { width: fillWidth }]} />
        <Animated.View style={[slider.thumb, { transform: [{ translateX: x }] }]} {...panResponder.panHandlers} />
      </View>
    </View>
  );
}

interface Weather {
  temp: number;
  code: number;
}

function WeatherWidget({ font, height }: { font: string; height?: number }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  const [useFahrenheit, setUseFahrenheit] = useState(true);

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
  const bg = tempColor(tempC);
  const mid = tempColor(tempC);
  const darker = tempColor(tempC - 22);
  const lightest = tempColor(tempC + 14);
  const { label, icon } = weather ? weatherLabel(weather.code) : { label: '...', icon: '' };
  const displayTemp = weather
    ? useFahrenheit ? `${weather.temp}°` : `${Math.round(tempC)}°`
    : '—';
  const unit = useFahrenheit ? 'F' : 'C';

  return (
    <View style={[wx.shadow, height ? { height, width: height } : undefined]}>
      <LinearGradient
        colors={[darker, mid, lightest]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[wx.card, height ? { height, width: height } : undefined]}
      >
        <View style={wx.inner}>
          <Text style={wx.icon}>{icon}</Text>
          <View style={wx.tempRow}>
            <Text style={[wx.temp, { fontFamily: font }]}>{displayTemp}</Text>
            <Text
              onPress={() => setUseFahrenheit(f => !f)}
              style={[wx.unit, { fontFamily: font }]}
            >{unit}</Text>
          </View>
          <Text style={[wx.label, { fontFamily: font }]}>{label}</Text>
        </View>
      </LinearGradient>
    </View>
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
      <WeatherWidget font="Archive" height={cardHeight} />
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
    height: THUMB_SIZE + 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 100,
    borderWidth: 1.5,
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
    borderRadius: 100,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Palette.blush,
    marginLeft: 4,
    shadowColor: Palette.blush,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
});
