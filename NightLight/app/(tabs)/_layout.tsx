import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNightMode } from '@/context/night-mode';

export default function TabLayout() {
  const { active } = useNightMode();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: active ? '#F472B6' : '#F5C842',
        tabBarInactiveTintColor: 'rgba(237,233,254,0.3)',
        tabBarStyle: {
          backgroundColor: '#0D0D0D',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
