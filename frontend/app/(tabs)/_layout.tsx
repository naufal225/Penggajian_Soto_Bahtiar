import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';

interface TabIconPillProps {
  color: string;
  focused: boolean;
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
}

function TabIconPill({ color, focused, iconName, label }: TabIconPillProps) {
  return (
    <View style={[styles.tabPill, focused ? styles.tabPillFocused : null]}>
      <MaterialIcons name={iconName} size={20} color={focused ? '#1D4ED8' : color} />
      <Text style={[styles.tabPillLabel, focused ? styles.tabPillLabelFocused : null]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const tabBarBottomSpacing = Platform.select({
    ios: Math.max(insets.bottom - 4, 10),
    default: 10,
  });

  const renderTabIcon =
    (name: React.ComponentProps<typeof MaterialIcons>['name'], label: string) => {
      function TabBarIcon({ color, focused }: { color: string; focused: boolean }) {
        return <TabIconPill color={color} focused={focused} iconName={name} label={label} />;
      }

      TabBarIcon.displayName = `TabBarIcon(${label})`;

      return TabBarIcon;
    };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: {
          position: 'absolute',
          height: Platform.select({ ios: 64 + bottomInset, default: 62 + bottomInset }),
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingHorizontal: 12,
          borderTopWidth: 0,
          backgroundColor: '#ffffff',
          borderRadius: 22,
          marginHorizontal: 14,
          marginBottom: tabBarBottomSpacing,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: renderTabIcon('home', 'Beranda'),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Gaji',
          tabBarIcon: renderTabIcon('account-balance-wallet', 'Gaji'),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Karyawan',
          tabBarIcon: renderTabIcon('groups', 'Karyawan'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    marginHorizontal: 3,
    marginVertical: 4,
  },
  tabPill: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillFocused: {
    backgroundColor: '#DCEAFF',
    borderRadius: 16,
  },
  tabPillLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabPillLabelFocused: {
    color: '#1D4ED8',
  },
});
