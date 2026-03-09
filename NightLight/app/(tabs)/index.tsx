import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 56; // container paddingHorizontal: 28 * 2

import { Palette } from '@/constants/theme';

const S = 3;
const WIDGET_SIZE = Math.floor((CARD_W - 12) / 2);
const TRACK_WIDTH = CARD_W;


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


function GlowText({ text, style, outlineColor = Palette.amber, fillColor = '#fcfbff' }: { text: string; style: object; outlineColor?: string; fillColor?: string }) {
  const outline = { color: outlineColor };
  const offsets = [
    { width: -S, height: -S }, { width: 0, height: -S }, { width: S, height: -S },
    { width: -S, height: 0 },                             { width: S, height: 0 },
    { width: -S, height: S  }, { width: 0, height: S  }, { width: S, height: S  },
  ];
  return (
    <View>
      {offsets.map((offset, i) => (
        <Text key={i} style={[style, outline, { textShadowColor: outlineColor, textShadowOffset: offset, textShadowRadius: 1, position: i === 0 ? undefined : 'absolute' }]}>{text}</Text>
      ))}
      <Text style={[style, {
        color: fillColor,
        position: 'absolute',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 4,
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
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      x.setValue(Math.min(Math.max(0, lastX.current + g.dx), maxDragRef.current));
    },
    onPanResponderRelease: (_, g) => {
      const next = Math.min(Math.max(0, lastX.current + g.dx), maxDragRef.current);
      if (lockedRef.current) {
        // dragging back past 55% unlocks
        if (next <= maxDragRef.current * 0.55) {
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
          lastX.current = 0;
          lockedRef.current = false;
          setLocked(false);
        } else {
          Animated.spring(x, { toValue: maxDragRef.current, useNativeDriver: false }).start();
          lastX.current = maxDragRef.current;
        }
      } else {
        // sliding past 40% locks
        if (next >= maxDragRef.current * 0.4) {
          Animated.spring(x, { toValue: maxDragRef.current, useNativeDriver: false }).start();
          lastX.current = maxDragRef.current;
          lockedRef.current = true;
          setLocked(true);
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
          lastX.current = 0;
        }
      }
    },
  })).current;

  const onTrackLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const drag = e.nativeEvent.layout.width - 68 - 16;
    maxDragRef.current = drag;
    setMaxDrag(drag);
  };

  const labelOpacity = x.interpolate({ inputRange: [0, maxDrag * 0.35], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={slider.wrapper}>
      <View style={slider.track} onLayout={onTrackLayout}>
        <Animated.View style={[slider.fill, { width: x.interpolate({ inputRange: [0, maxDrag], outputRange: [84, TRACK_WIDTH], extrapolate: 'clamp' }) }]} />
        <Animated.Text style={[slider.trackLabel, { opacity: labelOpacity }]}>
          {locked ? 'See you out there!' : 'Going out?'}
        </Animated.Text>
        <Animated.View style={[slider.thumb, { transform: [{ translateX: x }] }]} {...panResponder.panHandlers}>
          <Text style={slider.thumbIcon}>›</Text>
        </Animated.View>
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
          <View style={[wx.card, sizeStyle, { backgroundColor: '#FFF5D9' }]}>
            <View style={wx.inner}>
              <Text style={wx.icon}>{icon}</Text>
              <View style={wx.tempRow}>
                <Text style={[wx.temp, { fontFamily: font }]}>{displayTemp}</Text>
                <Text onPress={e => { e.stopPropagation(); setUseFahrenheit(f => !f); }} style={[wx.unit, { fontFamily: font }]}>{unit}</Text>
              </View>
              <Text style={[wx.label, { fontFamily: font }]}>{label}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[wx.face, wx.faceBack, sizeStyle, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
          <View style={[wx.card, sizeStyle, { backgroundColor: '#FFF5D9' }]}>
            <View style={wx.inner}>
              <Text style={[wx.wearTitle, { fontFamily: font }]}>What to wear</Text>
              <Text style={[wx.wearText, { fontFamily: font }]}>
                {weather ? whatToWear(tempC, weather.code) : '...'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ── Date widget ────────────────────────────────────────────────────────────
const FUN_FACTS = [
  "Honey never spoils — edible honey has been found in 3,000-year-old Egyptian tombs.",
  "A day on Venus is longer than a year on Venus.",
  "Octopuses have three hearts and blue blood.",
  "The Eiffel Tower grows about 6 inches taller in summer due to thermal expansion.",
  "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
  "Sharks are older than trees — they've existed for over 450 million years.",
  "There are more possible chess games than atoms in the observable universe.",
  "A group of flamingos is called a flamboyance.",
  "The shortest war in history lasted 38 minutes (Anglo-Zanzibar War, 1896).",
  "Oxford University is older than the Aztec Empire.",
  "It rains diamonds on Neptune and Uranus.",
  "Bananas are technically berries, but strawberries are not.",
  "There are more stars in the universe than grains of sand on all Earth's beaches.",
  "Wombats produce cube-shaped droppings — the only animal known to do so.",
  "Time passes slightly faster on the top floor of a building than at street level.",
  "The dot over the letters i and j is called a tittle.",
  "Scotland's national animal is the unicorn.",
  "The Moon is slowly drifting away from Earth at about 3.8 cm per year.",
  "Crows can recognize and remember individual human faces.",
  "The first computer bug was an actual bug — a moth found in a Harvard computer in 1947.",
  "Butterflies taste with their feet.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The Milky Way galaxy smells like raspberries and rum, according to astronomers.",
  "Penguins propose to their mates with a pebble.",
  "Humans share 60% of their DNA with bananas.",
  "Nintendo was founded in 1889 as a playing card company.",
  "A blue whale's heartbeat can be detected from 2 miles away.",
  "There's a planet made almost entirely of diamond — 55 Cancri e.",
  "Ants never sleep and don't have lungs.",
  "The human eye can distinguish about 10 million different colors.",
  "A snail can sleep for up to three years during drought.",
  "The inventor of Vaseline claimed to eat a spoonful of it every morning.",
  "Fingerprints of a koala are nearly indistinguishable from a human's.",
  "Hot water freezes faster than cold water — this is called the Mpemba effect.",
  "A bolt of lightning is five times hotter than the surface of the Sun.",
  "Cats have a dedicated organ — the Jacobson's organ — for smelling with their mouth.",
  "The average person walks the equivalent of five times around Earth in their lifetime.",
  "Water can boil and freeze simultaneously — this is called the triple point.",
  "Goats have rectangular pupils, giving them a nearly 360-degree field of vision.",
  "The inventor of the Pringles can is buried in one.",
];

function DateWidget({ font, height }: { font: string; height?: number }) {
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

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const fact = FUN_FACTS[dayOfYear % FUN_FACTS.length];

  const dayName = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayNum = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  const sizeStyle = height ? { height, width: height } : undefined;

  return (
    <Pressable onPress={flip}>
      <View style={[dw.shadow, sizeStyle]}>
        {/* Front */}
        <Animated.View style={[dw.face, sizeStyle, { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] }]}>
          <View style={[dw.card, sizeStyle, { backgroundColor: '#FFF5D9' }]}>
            <View style={dw.inner}>
              <Text style={[dw.dayName, { fontFamily: font }]}>{dayName}</Text>
              <Text style={[dw.dayNum, { fontFamily: font }]}>{dayNum}</Text>
              <Text style={[dw.month, { fontFamily: font }]}>{month}</Text>
            </View>
          </View>
        </Animated.View>
        {/* Back */}
        <Animated.View style={[dw.face, dw.faceBack, sizeStyle, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
          <View style={[dw.card, sizeStyle, { backgroundColor: '#FFF5D9' }]}>
            <View style={dw.inner}>
              <Text style={[dw.factTitle, { fontFamily: font }]}>Did you know?</Text>
              <Text style={[dw.factText, { fontFamily: font }]}>{fact}</Text>
            </View>
          </View>
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

  if (!fontsLoaded) return <LinearGradient colors={['#000000', '#000000', '#0F1F31']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container} />;

  return (
    <LinearGradient colors={['#000000', '#000000', '#0F1F31']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <View style={styles.cardShadow}>
        <View style={[styles.card, { backgroundColor: '#FFF5D9' }]}>
          <View style={styles.timeWrapper}>
            <GlowText text={time.clock} style={styles.time} outlineColor="#000000" fillColor="#000000" />
            <GlowText text={time.period} style={styles.period} outlineColor="#000000" fillColor="#000000" />
          </View>
        </View>
      </View>
      <View style={{ alignSelf: 'stretch', marginTop: 28 }}>
        <Text style={{ fontFamily: 'Archive', fontSize: 18, color: '#fcfbff', letterSpacing: 1, marginBottom: 10 }}>Another great day!</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <WeatherWidget font="Archive" height={WIDGET_SIZE} />
          <DateWidget font="Archive" height={WIDGET_SIZE} />
        </View>
      </View>
      <SlideBar />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 28,
  },
  cardShadow: {
    alignSelf: 'stretch',
    borderRadius: 28,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  card: {
    backgroundColor: '#FFF5D9',
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
    color: '#000000',
    letterSpacing: 4,
  },
  period: {
    fontFamily: 'Archive',
    fontSize: 22,
    color: '#000000',
    letterSpacing: 6,
    marginTop: -8,
  },
});

const wx = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    shadowColor: '#ffffff',
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
    color: '#000000',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  unit: {
    fontSize: 20,
    color: '#000000',
    opacity: 0.6,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    fontSize: 14,
    color: '#000000',
    letterSpacing: 1,
    opacity: 0.6,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wearTitle: {
    fontSize: 13,
    color: '#000000',
    opacity: 0.6,
    letterSpacing: 1,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wearText: {
    fontSize: 15,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

const slider = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: 28,
  },
  track: {
    width: TRACK_WIDTH,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 42,
    justifyContent: 'center',
  },
  trackLabel: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#fcfbff',
    fontSize: 20,
    fontFamily: 'Archive',
    letterSpacing: 1,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 42,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF5D9',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  thumbIcon: {
    fontSize: 28,
    color: '#555555',
    marginTop: -1,
  },
});

const dw = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  faceBack: {},
  card: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: {
    fontSize: 11,
    color: '#000000',
    opacity: 0.5,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dayNum: {
    fontSize: 52,
    color: '#000000',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  month: {
    fontSize: 11,
    color: '#000000',
    opacity: 0.5,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  factTitle: {
    fontSize: 11,
    color: '#000000',
    opacity: 0.5,
    letterSpacing: 1,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  factText: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
