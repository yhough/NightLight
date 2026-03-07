import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

const PINK = Palette.amber;

function GlowText({ text, style }: { text: string; style: object }) {
  return (
    <View>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20, opacity: 0.22 }]}>{text}</Text>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, opacity: 0.4, position: 'absolute' }]}>{text}</Text>
      <Text style={[style, { textShadowColor: PINK, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5, position: 'absolute' }]}>{text}</Text>
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
      <View style={styles.timeWrapper}>
        <GlowText text={time.clock} style={styles.time} />
        <GlowText text={time.period} style={styles.period} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    paddingTop: 130,
  },
  timeWrapper: {
    alignItems: 'center',
  },
  time: {
    fontFamily: 'CoreBandi',
    fontSize: 124,
    color: PINK,
    letterSpacing: 4,
  },
  period: {
    fontFamily: 'CoreBandi',
    fontSize: 35,
    color: PINK,
    letterSpacing: 6,
    marginTop: -8,
  },
});
