import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import AppNavigator from './src/navigation/AppNavigator';

function AuthNavigator({ onLogin }) {
  const [page, setPage] = useState('login');
  if (page === 'signup') return <SignupScreen onSignup={onLogin} onBack={() => setPage('login')} />;
  return <LoginScreen onLogin={onLogin} onSignup={() => setPage('signup')} />;
}

function TrialBanner({ company }) {
  if (!company || company.subscription_active || company.is_expired) return null;
  const days = company.days_remaining;
  if (days > 7) return null; // Only show when <= 7 days left
  const urgent = days <= 3;
  return (
    <View style={[styles.trialBanner, urgent && styles.trialBannerUrgent]}>
      <Text style={styles.trialBannerText}>
        {days === 0 ? '⚠️ Trial expires today!' : `⏰ Trial: ${days} day${days === 1 ? '' : 's'} left — Upgrade from ₹799/mo`}
      </Text>
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      // Fire-and-forget to warm up TCP connection before user tries to login
      fetch('https://task-tracker-backend-production-94c1.up.railway.app/api/ping').catch(() => {});
      try {
        const u = await AsyncStorage.getItem('tt_user');
        const c = await AsyncStorage.getItem('tt_company');
        if (u) {
          setUser(JSON.parse(u));
          setCompany(c ? JSON.parse(c) : null);
        }
      } catch {}
      finally { setLoading(false); }
    }
    restore();
  }, []);

  function handleLogin(u, c) { setUser(u); setCompany(c); }

  async function handleLogout() {
    await AsyncStorage.clear();
    setUser(null);
    setCompany(null);
  }

  if (loading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>T</Text>
        </View>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthNavigator onLogin={handleLogin} />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Trial expired (non-superadmin)
  if (user.role !== 'superadmin' && company?.is_expired) {
    return (
      <SafeAreaProvider>
        <PaywallScreen company={company} onLogout={handleLogout} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <TrialBanner company={company} />
      <NavigationContainer>
        <AppNavigator user={user} company={company} onLogout={handleLogout} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#312e81',
    alignItems: 'center', justifyContent: 'center',
  },
  splashLogo: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  splashLogoText: { fontSize: 32, fontWeight: '800', color: '#fff' },

  trialBanner: {
    backgroundColor: '#d97706',
    paddingVertical: 8, paddingHorizontal: 16,
    alignItems: 'center',
  },
  trialBannerUrgent: { backgroundColor: '#dc2626' },
  trialBannerText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
