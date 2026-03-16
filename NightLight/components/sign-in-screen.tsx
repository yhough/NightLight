import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const C = {
  bg: '#0D0D0D',
  gold: '#E8B030',
  goldBright: '#F5C842',
  goldDim: 'rgba(232,176,48,0.15)',
  goldBorder: 'rgba(232,176,48,0.25)',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
};

interface Props {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: Props) {
  const [fontsLoaded] = useFonts({
    Archive: require('@/assets/fonts/Archive.ttf'),
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const btnScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) return;
    onSignIn();
  };

  if (!fontsLoaded) return <View style={s.container} />;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#0D0D0D', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.inner}
      >
        {/* Logo */}
        <View style={s.logoBlock}>
          <Text style={[s.logoText, { fontFamily: 'Archive' }]}>NightLight</Text>
          <Text style={[s.tagline, { fontFamily: 'Archive' }]}>because no one likes hangxiety</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <TextInput
            style={[s.input, { fontFamily: 'Archive' }]}
            placeholder="Email"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={[s.input, { fontFamily: 'Archive' }]}
            placeholder="Password"
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Submit button */}
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSubmit}
          >
            <Animated.View style={[s.btn, { transform: [{ scale: btnScale }] }]}>
              <Text style={[s.btnText, { fontFamily: 'Archive' }]}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </Animated.View>
          </Pressable>

          {/* Toggle */}
          <Pressable onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
            <Text style={[s.toggle, { fontFamily: 'Archive' }]}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 999,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 48,
  },
  logoBlock: {
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 48,
    color: C.white,
    letterSpacing: 2,
    textShadowColor: C.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  tagline: {
    fontSize: 13,
    color: C.muted,
    letterSpacing: 1,
  },
  form: {
    alignSelf: 'stretch',
    gap: 14,
  },
  input: {
    height: 52,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.3,
  },
  btn: {
    height: 56,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  btnText: {
    fontSize: 16,
    color: C.goldBright,
    letterSpacing: 2,
  },
  toggle: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
