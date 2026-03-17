import { useFonts } from 'expo-font';
import { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Contact } from '@/context/night-mode';

interface Props {
  visible: boolean;
  contacts: Contact[];
  onDismiss: () => void;
  onSend: () => void;
}

const C = {
  bg: 'rgba(13,13,13,0.98)',
  danger: '#F87171',
  dangerBright: '#FCA5A5',
  dangerDim: 'rgba(248,113,113,0.12)',
  dangerBorder: 'rgba(248,113,113,0.3)',
  gold: '#E8B030',
  goldBright: '#F5C842',
  goldDim: 'rgba(232,176,48,0.1)',
  goldBorder: 'rgba(232,176,48,0.22)',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.5)',
};

export default function EmergencyModal({ visible, contacts, onDismiss, onSend }: Props) {
  const [fontsLoaded] = useFonts({ Archive: require('@/assets/fonts/Archive.ttf') });
  const sendScale = useRef(new Animated.Value(1)).current;

  if (!visible || !fontsLoaded) return null;

  const font = 'Archive';

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={s.icon}>⚠️</Text>
        <Text style={[s.headline, { fontFamily: font }]}>Missed check-in</Text>
        <Text style={[s.body, { fontFamily: font }]}>
          You didn't make it home by your set time and didn't respond to the check-ins.
          {contacts.length > 0
            ? ' Your Safe Circle will be sent your live location.'
            : ' Add contacts in Settings to enable automatic alerts.'}
        </Text>

        {contacts.length > 0 && (
          <View style={s.contacts}>
            {contacts.map((c) => (
              <View key={c.id} style={s.contactRow}>
                {c.imageUri
                  ? <Image source={{ uri: c.imageUri }} style={s.avatar} resizeMode="cover" />
                  : (
                    <View style={s.avatarFallback}>
                      <Text style={[s.avatarInitial, { fontFamily: font }]}>
                        {c.name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                  )}
                <View>
                  <Text style={[s.contactName, { fontFamily: font }]}>{c.name || 'Unknown'}</Text>
                  <Text style={[s.contactPhone, { fontFamily: font }]}>{c.phone || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {contacts.length > 0 && (
          <Pressable
            onPressIn={() => Animated.spring(sendScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(sendScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={onSend}
          >
            <Animated.View style={[s.sendBtn, { transform: [{ scale: sendScale }] }]}>
              <Text style={[s.sendBtnText, { fontFamily: font }]}>Send location now</Text>
            </Animated.View>
          </Pressable>
        )}

        <Pressable onPress={onDismiss} style={s.dismissBtn}>
          <Text style={[s.dismissText, { fontFamily: font }]}>I made it home safely</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 14,
  },
  icon: {
    fontSize: 52,
    marginBottom: 4,
  },
  headline: {
    fontSize: 28,
    color: C.dangerBright,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: C.danger,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  body: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  contacts: {
    alignSelf: 'stretch',
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    color: C.dangerBright,
  },
  contactName: {
    fontSize: 14,
    color: C.white,
    letterSpacing: 0.2,
  },
  contactPhone: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  sendBtn: {
    alignSelf: 'stretch',
    height: 56,
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  sendBtnText: {
    fontSize: 15,
    color: C.dangerBright,
    letterSpacing: 1,
  },
  dismissBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.3,
  },
});
