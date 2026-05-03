import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';

const PLANS = [
  { label: 'Basic',   price: '₹199', per: '/mo', wa: '300 WA/mo',   color: '#6b7280' },
  { label: 'Starter', price: '₹299', per: '/mo', wa: '500 WA/mo',   color: '#4f46e5', popular: true },
  { label: 'Growth',  price: '₹599', per: '/mo', wa: '1,000 WA/mo', color: '#0891b2' },
];

export default function PaywallScreen({ company, onLogout }) {
  function openWebsite() {
    Linking.openURL('https://task-tracker-backend-production-94c1.up.railway.app').catch(() => {
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
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.iconWrap}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
        </View>

        <Text style={s.title}>Free trial ended</Text>
        <Text style={s.sub}>
          {company?.company_name ? `${company.company_name}'s ` : ''}30-day trial is over.{'\n'}
          Choose a plan to continue.
        </Text>

        <View style={s.plansCol}>
          {PLANS.map(p => (
            <TouchableOpacity key={p.label} style={[s.planCard, p.popular && s.planCardFeatured]} activeOpacity={0.85} onPress={openWebsite}>
              {p.popular && (
                <View style={s.saveBadge}><Text style={s.saveBadgeText}>POPULAR</Text></View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[s.planLabel, { color: p.color }]}>{p.label}</Text>
                  <Text style={s.planWa}>💬 {p.wa}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.planPrice, p.popular && { color: '#fff' }]}>
                    {p.price}<Text style={s.planPer}>{p.per}</Text>
                  </Text>
                  <Text style={[s.planYearly, p.popular && { color: 'rgba(255,255,255,0.6)' }]}>
                    10% off on yearly
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.upgradeBtn} onPress={openWebsite} activeOpacity={0.85}>
          <Text style={s.upgradeBtnText}>Upgrade on Website →</Text>
        </TouchableOpacity>

        <Text style={s.hint}>Payment is done on the web app.{'\n'}After payment, logout and login again.</Text>

        <TouchableOpacity onPress={handleLogout} style={{ marginTop: 24 }}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#312e81' },
  content: { alignItems: 'center', padding: 28, paddingBottom: 40 },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  plansCol: { width: '100%', gap: 10, marginBottom: 24 },

  planCard: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  planCardFeatured: {
    backgroundColor: '#4f46e5',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  saveBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  saveBadgeText: { fontSize: 9, fontWeight: '800', color: '#4f46e5' },

  planLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  planWa: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  planPrice: { fontSize: 24, fontWeight: '800', color: '#fff' },
  planPer: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.55)' },
  planYearly: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  upgradeBtn: {
    backgroundColor: '#fff', borderRadius: radius.md,
    paddingVertical: 15, paddingHorizontal: 32, width: '100%', alignItems: 'center',
    ...shadow.md,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '800', color: '#312e81' },

  hint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
});
