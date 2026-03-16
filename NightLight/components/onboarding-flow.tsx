import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useNightMode } from '@/context/night-mode';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  bg: '#0D0D0D',
  gold: '#E8B030',
  goldBright: '#F5C842',
  goldDim: 'rgba(232,176,48,0.13)',
  goldBorder: 'rgba(232,176,48,0.25)',
  pink: '#E8558A',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  subtle: 'rgba(255,255,255,0.08)',
  subtleBorder: 'rgba(255,255,255,0.1)',
};

const TOTAL_STEPS = 6;

import type { Contact } from '@/context/night-mode';

// ── Progress dots ────────────────────────────────────────────────────────────
function Dots({ step }: { step: number }) {
  return (
    <View style={dots.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            dots.dot,
            i === step && dots.active,
            i < step && dots.done,
          ]}
        />
      ))}
    </View>
  );
}

// ── Shared CTA button ────────────────────────────────────────────────────────
function CTAButton({ label, onPress, dim }: { label: string; onPress: () => void; dim?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[btn.base, dim && btn.dim, { transform: [{ scale }] }]}>
        <Text style={btn.label}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SkipButton({ label, onPress, font }: { label: string; onPress: () => void; font: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginTop: 16, alignItems: 'center' }}>
      <Text style={[{ fontFamily: font, fontSize: 13, color: C.muted, letterSpacing: 0.3 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Screen 0: Welcome ────────────────────────────────────────────────────────
function WelcomeScreen({ onNext, font }: { onNext: () => void; font: string }) {
  return (
    <View style={sc.screen}>
      <View style={sc.center}>
        <Text style={[sc.logoTitle, { fontFamily: font }]}>NightLight</Text>
        <Text style={[sc.headline, { fontFamily: font, marginTop: 32 }]}>
          before the night starts.
        </Text>
        <Text style={[sc.sub, { fontFamily: font }]}>
          A quiet safety layer for nights out. Set it up once, forget it's there.
        </Text>
      </View>
      <CTAButton label="Let's get you set up →" onPress={onNext} />
    </View>
  );
}

// ── Screen 1: Privacy ────────────────────────────────────────────────────────
const TRUST_POINTS = [
  { icon: '🔒', text: 'Your data stays on your device.' },
  { icon: '🤫', text: 'We only reach out if you need it.' },
  { icon: '🎛️', text: 'You control everything, always.' },
];

function PrivacyScreen({ onNext, font }: { onNext: () => void; font: string }) {
  return (
    <View style={sc.screen}>
      <View style={sc.center}>
        <Text style={[sc.icon, { fontFamily: font }]}>🛡️</Text>
        <Text style={[sc.headline, { fontFamily: font }]}>
          We're not watching.{'\n'}We're just there.
        </Text>
        <Text style={[sc.sub, { fontFamily: font }]}>
          NightLight is a safety net — not surveillance.
        </Text>
        <View style={sc.trustList}>
          {TRUST_POINTS.map((p, i) => (
            <View key={i} style={sc.trustRow}>
              <Text style={sc.trustIcon}>{p.icon}</Text>
              <Text style={[sc.trustText, { fontFamily: font }]}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <CTAButton label="Sounds good →" onPress={onNext} />
    </View>
  );
}

// ── Screen 2: Safe Location ──────────────────────────────────────────────────
function LocationScreen({
  onNext,
  font,
  homeAddress,
  setHomeAddress,
}: {
  onNext: () => void;
  font: string;
  homeAddress: string;
  setHomeAddress: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const useCurrentLocation = async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Location permission denied.'); setLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const addr = [geo.name, geo.street, geo.city, geo.region]
        .filter(Boolean).join(', ');
      setHomeAddress(addr);
    } catch {
      setError('Could not get location. Try entering it manually.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={sc.screen}>
          <View style={sc.center}>
            <Text style={sc.icon}>🏠</Text>
            <Text style={[sc.headline, { fontFamily: font }]}>Where's home?</Text>
            <Text style={[sc.sub, { fontFamily: font }]}>
              We'll check in here at the end of your night.
            </Text>
            <TextInput
              style={[sc.input, { fontFamily: font }]}
              placeholder="Your home address"
              placeholderTextColor={C.muted}
              value={homeAddress}
              onChangeText={setHomeAddress}
              autoCorrect={false}
            />
            {error ? <Text style={[sc.errorText, { fontFamily: font }]}>{error}</Text> : null}
            <TouchableOpacity onPress={useCurrentLocation} style={sc.secondaryBtn}>
              <Text style={[sc.secondaryBtnText, { fontFamily: font }]}>
                {loading ? 'Getting location…' : '📍 Use my current location'}
              </Text>
            </TouchableOpacity>
          </View>
          <CTAButton label="This is home →" onPress={onNext} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Screen 3: Safe Circle ────────────────────────────────────────────────────
function SafeCircleScreen({
  onNext,
  font,
  contacts,
  setContacts,
}: {
  onNext: () => void;
  font: string;
  contacts: Contact[];
  setContacts: (c: Contact[]) => void;
}) {
  const addContact = () => {
    if (contacts.length >= 3) return;
    setContacts([...contacts, { id: Date.now().toString(), name: '', phone: '' }]);
  };

  const updateContact = (id: string, field: 'name' | 'phone', value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={sc.screen}>
          <View style={sc.center}>
            <Text style={sc.icon}>🫂</Text>
            <Text style={[sc.headline, { fontFamily: font }]}>Who's got your back?</Text>
            <Text style={[sc.sub, { fontFamily: font }]}>
              Add 1–3 people to reach if something feels off.{'\n'}They'll only hear from us if you ask.
            </Text>

            {contacts.map((c, i) => (
              <View key={c.id} style={sc.contactCard}>
                <View style={sc.contactHeader}>
                  <Text style={[sc.contactLabel, { fontFamily: font }]}>Contact {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeContact(c.id)}>
                    <Text style={[sc.removeText, { fontFamily: font }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[sc.input, { fontFamily: font, marginBottom: 8 }]}
                  placeholder="Name"
                  placeholderTextColor={C.muted}
                  value={c.name}
                  onChangeText={v => updateContact(c.id, 'name', v)}
                />
                <TextInput
                  style={[sc.input, { fontFamily: font }]}
                  placeholder="Phone number"
                  placeholderTextColor={C.muted}
                  value={c.phone}
                  onChangeText={v => updateContact(c.id, 'phone', v)}
                  keyboardType="phone-pad"
                />
              </View>
            ))}

            {contacts.length < 3 && (
              <TouchableOpacity onPress={addContact} style={sc.addBtn}>
                <Text style={[sc.addBtnText, { fontFamily: font }]}>+ Add a contact</Text>
              </TouchableOpacity>
            )}
          </View>
          <CTAButton label="Continue →" onPress={onNext} />
          {contacts.length === 0 && <SkipButton label="Skip for now" onPress={onNext} font={font} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Screen 4: Impulse Firewall ───────────────────────────────────────────────
function ImpulseScreen({
  onNext,
  onSkip,
  font,
  enabled,
  setEnabled,
}: {
  onNext: () => void;
  onSkip: () => void;
  font: string;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}) {
  return (
    <View style={sc.screen}>
      <View style={sc.center}>
        <Text style={sc.icon}>💬</Text>
        <Text style={[sc.headline, { fontFamily: font }]}>Protect your{'\n'}2am texts.</Text>
        <Text style={[sc.sub, { fontFamily: font }]}>
          Add a 10-minute send delay to messages you might regret. Future you will be grateful.
        </Text>

        <TouchableOpacity onPress={() => setEnabled(!enabled)} style={sc.toggleRow}>
          <View style={sc.toggleInfo}>
            <Text style={[sc.toggleTitle, { fontFamily: font }]}>Impulse Firewall</Text>
            <Text style={[sc.toggleSub, { fontFamily: font }]}>
              10-minute delay on outgoing messages
            </Text>
          </View>
          <View style={[sc.toggle, enabled && sc.toggleOn]}>
            <Animated.View style={[sc.toggleThumb, enabled && sc.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {enabled && (
          <View style={sc.impulseTip}>
            <Text style={[sc.impulseTipText, { fontFamily: font }]}>
              You can customize which contacts this applies to in Settings.
            </Text>
          </View>
        )}
      </View>

      <CTAButton label={enabled ? 'Set it up →' : 'Skip for now →'} onPress={enabled ? onNext : onSkip} />
      {enabled && <SkipButton label="Skip for now" onPress={onSkip} font={font} />}
    </View>
  );
}

// ── Screen 5: All Set ────────────────────────────────────────────────────────
function AllSetScreen({ onDone, font }: { onDone: () => void; font: string }) {
  const glow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.6, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={sc.screen}>
      <View style={sc.center}>
        <Animated.Text style={[sc.bigCheck, { opacity: glow }]}>✦</Animated.Text>
        <Text style={[sc.headline, { fontFamily: font }]}>You're all set.</Text>
        <Text style={[sc.sub, { fontFamily: font }]}>
          Head out whenever you're ready.{'\n'}NightLight's got you.
        </Text>
      </View>
      <CTAButton label="Take me home →" onPress={onDone} />
    </View>
  );
}

// ── Main OnboardingFlow ──────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: Props) {
  const [fontsLoaded] = useFonts({
    Archive: require('@/assets/fonts/Archive.ttf'),
  });

  const {
    homeAddress, setHomeAddress,
    contacts, setContacts,
    impulseEnabled, setImpulseEnabled,
  } = useNightMode();

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const next = () => goTo(Math.min(step + 1, TOTAL_STEPS - 1));
  const skip = () => goTo(TOTAL_STEPS - 1);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const font = 'Archive';

  return (
    <View style={flow.container}>
      <LinearGradient colors={[C.bg, C.bg]} style={StyleSheet.absoluteFill} />

      <Dots step={step} />

      <Animated.View style={[flow.content, { opacity: fadeAnim }]}>
        {step === 0 && <WelcomeScreen onNext={next} font={font} />}
        {step === 1 && <PrivacyScreen onNext={next} font={font} />}
        {step === 2 && (
          <LocationScreen
            onNext={next}
            font={font}
            homeAddress={homeAddress}
            setHomeAddress={setHomeAddress}
          />
        )}
        {step === 3 && (
          <SafeCircleScreen
            onNext={next}
            font={font}
            contacts={contacts}
            setContacts={setContacts}
          />
        )}
        {step === 4 && (
          <ImpulseScreen
            onNext={next}
            onSkip={skip}
            font={font}
            enabled={impulseEnabled}
            setEnabled={setImpulseEnabled}
          />
        )}
        {step === 5 && <AllSetScreen onDone={onComplete} font={font} />}
      </Animated.View>
    </View>
  );
}

// ── StyleSheets ───────────────────────────────────────────────────────────────
const flow = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 998,
    paddingTop: 64,
    paddingBottom: 48,
  },
  content: {
    flex: 1,
  },
});

const dots = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  active: {
    backgroundColor: C.goldBright,
    width: 18,
  },
  done: {
    backgroundColor: 'rgba(232,176,48,0.35)',
  },
});

const btn = StyleSheet.create({
  base: {
    height: 56,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 32,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  dim: {
    opacity: 0.5,
  },
  label: {
    fontFamily: 'Archive',
    fontSize: 16,
    color: C.goldBright,
    letterSpacing: 1,
  },
});

const sc = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  icon: {
    fontSize: 44,
    marginBottom: 8,
  },
  bigCheck: {
    fontSize: 64,
    color: C.goldBright,
    textShadowColor: C.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 46,
    color: C.white,
    letterSpacing: 2,
    textShadowColor: C.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  headline: {
    fontSize: 26,
    color: C.white,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 34,
  },
  sub: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  trustList: {
    alignSelf: 'stretch',
    marginTop: 20,
    gap: 14,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  trustIcon: {
    fontSize: 20,
  },
  trustText: {
    fontSize: 14,
    color: C.white,
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  input: {
    alignSelf: 'stretch',
    height: 52,
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    letterSpacing: 0.2,
    marginTop: -4,
  },
  secondaryBtn: {
    marginTop: 6,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: C.goldBright,
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  contactCard: {
    alignSelf: 'stretch',
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  removeText: {
    fontSize: 12,
    color: '#F87171',
    letterSpacing: 0.3,
  },
  addBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 14,
    color: C.muted,
    letterSpacing: 0.5,
  },
  toggleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    gap: 16,
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.2,
  },
  toggleSub: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: 'rgba(232,176,48,0.35)',
    borderColor: C.goldBorder,
    borderWidth: 1,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  toggleThumbOn: {
    backgroundColor: C.goldBright,
    alignSelf: 'flex-end',
  },
  impulseTip: {
    alignSelf: 'stretch',
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  impulseTipText: {
    fontSize: 13,
    color: C.goldBright,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
