import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

const PINK = Palette.blush;

function GlowText({ text, style }: { text: string; style: object }) {
  return (
    <View>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3, opacity: 0.08 }]}>{text}</Text>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2, opacity: 0.12, position: 'absolute' }]}>{text}</Text>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 1, position: 'absolute' }]}>{text}</Text>
      <Text style={[style, { position: 'absolute' }]}>{text}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    CoreBandi: require('@/assets/fonts/CoreBandi.ttf'),
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

  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {/* Nested wrappers for layered box glow */}
      <View style={styles.glow3}>
        <View style={styles.glow2}>
          <View style={styles.glow1}>
            <View style={styles.box}>
              <GlowText text={time.clock} style={styles.time} />
              <GlowText text={time.period} style={styles.period} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    paddingTop: 100,
  },
  glow3: {
    borderRadius: 36,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },
  glow2: {
    borderRadius: 36,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  glow1: {
    borderRadius: 36,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 40,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: PINK,
  },
  time: {
    fontFamily: 'CoreBandi',
    fontSize: 128,
    color: PINK,
    letterSpacing: 4,
  },
  period: {
    fontFamily: 'CoreBandi',
    fontSize: 36,
    color: PINK,
    letterSpacing: 6,
    marginTop: 4,
  },
});
