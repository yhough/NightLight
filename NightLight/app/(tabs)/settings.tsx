import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import { useState } from 'react';
import {
  Alert,
  Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNightMode, type Contact } from '@/context/night-mode';

const C = {
  bg: '#0D0D0D',
  gold: '#E8B030',
  goldBright: '#F5C842',
  goldDim: 'rgba(232,176,48,0.12)',
  goldBorder: 'rgba(232,176,48,0.22)',
  pink: '#E8558A',
  pinkBright: '#F472B6',
  pinkDim: 'rgba(232,85,138,0.12)',
  pinkBorder: 'rgba(232,85,138,0.22)',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  subtle: 'rgba(255,255,255,0.05)',
  subtleBorder: 'rgba(255,255,255,0.09)',
  danger: '#F87171',
  dangerDim: 'rgba(248,113,113,0.1)',
  dangerBorder: 'rgba(248,113,113,0.25)',
};

function SectionHeader({ title, font }: { title: string; font: string }) {
  return (
    <Text style={[s.sectionHeader, { fontFamily: font }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const [fontsLoaded] = useFonts({
    Archive: require('@/assets/fonts/Archive.ttf'),
  });

  const insets = useSafeAreaInsets();
  const {
    active,
    homeAddress, setHomeAddress,
    homeByTime, setHomeByTime,
    contacts, setContacts,
    logout,
  } = useNightMode();

  const accent = active ? C.pinkBright : C.goldBright;
  const accentDim = active ? C.pinkDim : C.goldDim;
  const accentBorder = active ? C.pinkBorder : C.goldBorder;

  const [locLoading, setLocLoading] = useState(false);
  const [editingTime, setEditingTime] = useState(false);

  const useCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const addr = [
        geo.streetNumber,
        geo.street,
        geo.city,
        geo.region,
        geo.postalCode,
      ].filter(Boolean).join(', ');
      setHomeAddress(addr);
    } catch {}
    setLocLoading(false);
  };

  const addContact = async () => {
    if (contacts.length >= 3) return;
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;
    const result = await Contacts.presentContactPickerAsync();
    if (!result) return;
    const name = result.name || [result.firstName, result.lastName].filter(Boolean).join(' ') || '';
    const phone = result.phoneNumbers?.[0]?.number ?? '';
    // Use image from picker result if available
    let imageUri: string | undefined = result.image?.uri;
    if (!imageUri && result.id) {
      try {
        const full = await Contacts.getContactByIdAsync(result.id, [Contacts.Fields.Image]);
        imageUri = full?.image?.uri;
      } catch {
        // image unavailable — fallback to initial avatar
      }
    }
    setContacts([...contacts, { id: Date.now().toString(), name, phone, imageUri }]);
  };

  const removeContact = (id: string) => {
    Alert.alert('Remove contact', 'Remove this person from your Safe Circle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setContacts(contacts.filter(c => c.id !== id)) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const font = 'Archive';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={[s.title, { fontFamily: font }]}>Settings</Text>

        {/* ── Home Location ── */}
        <SectionHeader title="HOME LOCATION" font={font} />
        <View style={s.card}>
          <TextInput
            style={[s.input, { fontFamily: font }]}
            placeholder="Your home address"
            placeholderTextColor={C.muted}
            value={homeAddress}
            onChangeText={setHomeAddress}
            autoCorrect={false}
          />
          <TouchableOpacity onPress={useCurrentLocation} style={s.inlineBtn}>
            <Text style={[s.inlineBtnText, { fontFamily: font, color: accent }]}>
              {locLoading ? 'Getting location…' : '📍 Use current location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Home By Time ── */}
        <SectionHeader title="USUAL HOME TIME" font={font} />
        <View style={s.card}>
          <View style={s.timeRow}>
            <Text style={[s.timeDisplay, { fontFamily: font }]}>
              {homeByTime
                ? homeByTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : 'Not set'}
            </Text>
            <TouchableOpacity onPress={() => {
              if (!homeByTime) {
                const d = new Date();
                d.setHours(1, 0, 0, 0);
                setHomeByTime(d);
              }
              setEditingTime(e => !e);
            }}>
              <Text style={[s.inlineBtnText, { fontFamily: font, color: accent }]}>
                {editingTime ? 'Done' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>
          {editingTime && homeByTime && (
            <DateTimePicker
              value={homeByTime}
              mode="time"
              display="spinner"
              onChange={(_, selected) => selected && setHomeByTime(selected)}
              textColor="#FFFFFF"
              themeVariant="dark"
            />
          )}
        </View>

        {/* ── Safe Circle ── */}
        <SectionHeader title="SAFE CIRCLE" font={font} />
        <View style={s.card}>
          {contacts.length === 0 && (
            <Text style={[s.emptyText, { fontFamily: font }]}>No contacts added yet.</Text>
          )}
          {contacts.map((c, i) => (
            <View key={c.id} style={[s.contactBlock, i > 0 && s.contactDivider]}>
              <View style={s.contactHeaderRow}>
                <View style={s.contactInfo}>
                  {c.imageUri
                    ? <Image source={{ uri: c.imageUri }} style={s.avatar} resizeMode="cover" />
                    : <View style={[s.avatarFallback, { backgroundColor: accentDim, borderColor: accentBorder }]}><Text style={[s.avatarInitial, { fontFamily: font, color: accent }]}>{c.name?.[0]?.toUpperCase() ?? '?'}</Text></View>
                  }
                  <View>
                    <Text style={[s.contactName, { fontFamily: font }]}>{c.name || 'Unknown'}</Text>
                    <Text style={[s.contactPhone, { fontFamily: font }]}>{c.phone || '—'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeContact(c.id)}>
                  <Text style={[s.removeText, { fontFamily: font }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {contacts.length < 3 && (
            <TouchableOpacity onPress={addContact} style={[s.inlineBtn, contacts.length > 0 && { marginTop: 14 }]}>
              <Text style={[s.inlineBtnText, { fontFamily: font, color: accent }]}>+ Add a contact</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Account ── */}
        <SectionHeader title="ACCOUNT" font={font} />
        <Pressable onPress={handleLogout} style={s.logoutBtn}>
          <Text style={[s.logoutText, { fontFamily: font }]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.subtleBorder,
    borderRadius: 16,
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeDisplay: {
    fontSize: 17,
    color: C.white,
    letterSpacing: 0.3,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.3,
  },
  inlineBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  inlineBtnText: {
    fontSize: 14,
    color: C.goldBright,
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  contactBlock: {
    gap: 0,
  },
  contactDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  contactHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232,176,48,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,176,48,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    color: '#F5C842',
  },
  contactLabel: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
  },
  contactName: {
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.2,
  },
  contactPhone: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  removeText: {
    fontSize: 12,
    color: C.danger,
    letterSpacing: 0.3,
  },
  logoutBtn: {
    backgroundColor: C.dangerDim,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    color: C.danger,
    letterSpacing: 1,
  },
});
