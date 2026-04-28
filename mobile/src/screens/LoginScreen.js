import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

export default function LoginScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email and password required');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      await AsyncStorage.setItem('tt_token', data.token);
      await AsyncStorage.setItem('tt_user', JSON.stringify(data.user));
      if (data.company) await AsyncStorage.setItem('tt_company', JSON.stringify(data.company));
      onLogin(data.user, data.company);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>T</Text>
          </View>
          <Text style={s.appTitle}>Task Delegation Tracker</Text>
          <Text style={s.appSub}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onSignup} style={s.switchWrap}>
          <Text style={s.switchText}>
            Don't have an account?{' '}
            <Text style={s.switchLink}>Start 30-day free trial</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#312e81' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  appTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  appSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },

  card: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    padding: 24, ...shadow.md,
  },

  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 12, fontSize: 14, color: colors.text, backgroundColor: '#fafafa',
  },

  btn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    padding: 14, alignItems: 'center', marginTop: 24,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  switchWrap: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  switchLink: { color: '#fff', fontWeight: '700' },
});
