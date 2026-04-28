import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';

export default function SettingsScreen({ user, company, onLogout }) {
  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          onLogout();
        }
      },
    ]);
  }

  const daysLeft = company?.days_remaining;
  const isActive = company?.subscription_active;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.content}>
        {/* User card */}
        <View style={[s.card, { marginBottom: 16 }]}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{user?.role === 'admin' ? '👑 Admin' : '👤 Member'}</Text>
          </View>
        </View>

        {/* Company info */}
        {company && (
          <View style={[s.infoCard, { marginBottom: 16 }]}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Company</Text>
              <Text style={s.infoValue}>{company.company_name}</Text>
            </View>
            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={s.infoLabel}>Plan</Text>
              {isActive ? (
                <Text style={[s.infoValue, { color: colors.success }]}>✅ Active</Text>
              ) : (
                <Text style={[s.infoValue, { color: colors.warning }]}>
                  🕐 Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </Text>
              )}
            </View>
          </View>
        )}

        {/* App info */}
        <View style={[s.infoCard, { marginBottom: 24 }]}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>App</Text>
            <Text style={s.infoValue}>Task Delegation Tracker</Text>
          </View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={s.infoLabel}>Version</Text>
            <Text style={s.infoValue}>1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 20 },

  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, alignItems: 'center', ...shadow.sm, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.primary },
  userName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  userEmail: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  roleBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  infoCard: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.text },

  logoutBtn: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
