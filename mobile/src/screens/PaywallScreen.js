import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';

export default function PaywallScreen({ company, onLogout }) {
  function openWebsite() {
    Linking.openURL('https://task-tracker-saas.onrender.com').catch(() => {
      Alert.alert('Error', 'Could not open browser');
    });
  }

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

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.iconWrap}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
        </View>

        <Text style={s.title}>Free trial ended</Text>
        <Text style={s.sub}>
          {company?.company_name ? `${company.company_name}'s ` : ''}30-day trial is over.{'\n'}
          Upgrade to continue using the app.
        </Text>

        <View style={s.plansRow}>
          <View style={s.planCard}>
            <Text style={s.planLabel}>MONTHLY</Text>
            <Text style={s.planPrice}>₹799<Text style={s.planPer}>/mo</Text></Text>
          </View>
          <View style={[s.planCard, s.planCardFeatured]}>
            <View style={s.saveBadge}><Text style={s.saveBadgeText}>SAVE 27%</Text></View>
            <Text style={[s.planLabel, { color: colors.success }]}>YEARLY</Text>
            <Text style={[s.planPrice, { color: colors.success }]}>₹6,999<Text style={s.planPer}>/yr</Text></Text>
          </View>
        </View>

        <TouchableOpacity style={s.upgradeBtn} onPress={openWebsite} activeOpacity={0.85}>
          <Text style={s.upgradeBtnText}>Upgrade on Website →</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Payment is done on the web app.{'\n'}After payment, logout and login again.</Text>

        <TouchableOpacity onPress={handleLogout} style={{ marginTop: 24 }}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#312e81' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  plansRow: { flexDirection: 'row', gap: 12, marginBottom: 28, width: '100%' },
  planCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md,
    padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  planCardFeatured: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.4)', position: 'relative',
  },
  saveBadge: {
    position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -28 }],
    backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  planLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, marginBottom: 6 },
  planPrice: { fontSize: 26, fontWeight: '800', color: '#fff' },
  planPer: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.6)' },

  upgradeBtn: {
    backgroundColor: '#fff', borderRadius: radius.md,
    paddingVertical: 15, paddingHorizontal: 32, width: '100%', alignItems: 'center',
    ...shadow.md,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '800', color: '#312e81' },

  hint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' },
});
