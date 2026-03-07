import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';

const S = 3;

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

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    CoreBandi: require('@/assets/fonts/CoreBandi.ttf'),
    LilitaOne: require('@/assets/fonts/LilitaOne.ttf'),
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
      <View style={styles.cardShadow}>
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
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  timeWrapper: {
    alignItems: 'center',
  },
  time: {
    fontFamily: 'LilitaOne',
    fontSize: 80,
    color: '#fcfbff',
    letterSpacing: 4,
  },
  period: {
    fontFamily: 'LilitaOne',
    fontSize: 22,
    color: '#fcfbff',
    letterSpacing: 6,
    marginTop: -8,
  },
});
