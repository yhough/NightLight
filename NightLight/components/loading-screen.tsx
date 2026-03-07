import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

interface LoadingScreenProps {
  onFinish: () => void;
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const player = useVideoPlayer(require('@/assets/videos/NightLight.mp4'), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  const called = useRef(false);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      if (!called.current) {
        called.current = true;
        onFinish();
      }
    });
    return () => sub.remove();
  }, [player, onFinish]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        backgroundColor="#000000"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: 340,
    height: 340,
    backgroundColor: '#000000',
  },
});
