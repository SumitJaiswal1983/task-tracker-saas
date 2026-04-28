import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import TasksScreen from '../screens/TasksScreen';
import PeopleScreen from '../screens/PeopleScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const SHEETS = ['Sheet 1', 'Sheet 2'];

function TabIcon({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4, width: 70 }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10, fontWeight: focused ? '700' : '500',
          color: focused ? colors.primary : colors.textMuted,
          marginTop: 2, textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function HeaderRight({ sheet, setSheet }) {
  return (
    <View style={s.sheetWrap}>
      {SHEETS.map(sh => (
        <TouchableOpacity
          key={sh}
          style={[s.sheetBtn, sheet === sh && s.sheetBtnActive]}
          onPress={() => setSheet(sh)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[s.sheetBtnText, sheet === sh && s.sheetBtnTextActive]}>{sh}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AppNavigator({ user, company, onLogout }) {
  const [sheet, setSheet] = useState('Sheet 1');
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        // Header: let React Navigation handle status bar height automatically
        headerStyle: { backgroundColor: '#312e81' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        // Tab bar: add bottom inset so it sits above gesture bar
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          headerTitle: 'Dashboard',
          headerRight: () => <HeaderRight sheet={sheet} setSheet={setSheet} />,
          headerRightContainerStyle: { paddingRight: 12 },
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Home" focused={focused} />,
        }}
      >
        {() => <DashboardScreen currentUser={user} sheetName={sheet} />}
      </Tab.Screen>

      <Tab.Screen
        name="Tasks"
        options={{
          headerTitle: 'Tasks',
          headerRight: () => <HeaderRight sheet={sheet} setSheet={setSheet} />,
          headerRightContainerStyle: { paddingRight: 12 },
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Tasks" focused={focused} />,
        }}
      >
        {() => <TasksScreen sheetName={sheet} />}
      </Tab.Screen>

      {isAdmin && (
        <Tab.Screen
          name="People"
          options={{
            headerTitle: 'People & Sections',
            tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="People" focused={focused} />,
          }}
        >
          {() => <PeopleScreen />}
        </Tab.Screen>
      )}

      <Tab.Screen
        name="Settings"
        options={{
          headerTitle: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" label="More" focused={focused} />,
        }}
      >
        {() => <SettingsScreen user={user} company={company} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  sheetWrap: { flexDirection: 'row', gap: 6 },
  sheetBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 7, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    minWidth: 60, alignItems: 'center',
  },
  sheetBtnActive: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.55)' },
  sheetBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  sheetBtnTextActive: { color: '#fff' },
});
