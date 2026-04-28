import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

export default function SignupScreen({ onSignup, onBack }) {
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (val) => setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSignup() {
    if (!form.company_name.trim() || !form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);
    try {
      const data = await api.signup(form);
      await AsyncStorage.setItem('tt_token', data.token);
      await AsyncStorage.setItem('tt_user', JSON.stringify(data.user));
      await AsyncStorage.setItem('tt_company', JSON.stringify(data.company));
      onSignup(data.user, data.company);
    } catch (err) {
      Alert.alert('Signup Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>T</Text>
          </View>
          <Text style={s.appTitle}>Start Free Trial</Text>
          <Text style={s.appSub}>30 days free. No credit card needed.</Text>
        </View>

        <View style={s.card}>
          {[
            { label: 'Company Name', field: 'company_name', placeholder: 'Highflow Industries' },
            { label: 'Your Name', field: 'name', placeholder: 'Sumit Jaiswal' },
            { label: 'Work Email', field: 'email', placeholder: 'you@company.com', keyboard: 'email-address' },
            { label: 'Password', field: 'password', placeholder: 'Min. 6 characters', secure: true },
          ].map((item, i) => (
            <View key={item.field} style={i > 0 ? { marginTop: 14 } : {}}>
              <Text style={s.label}>{item.label}</Text>
              <TextInput
                style={s.input}
                value={form[item.field]}
                onChangeText={set(item.field)}
                placeholder={item.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={item.keyboard || 'default'}
                autoCapitalize={item.keyboard === 'email-address' ? 'none' : 'words'}
                secureTextEntry={item.secure || false}
                autoCorrect={false}
              />
            </View>
          ))}

          <TouchableOpacity style={s.btn} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Start Free Trial</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onBack} style={s.switchWrap}>
          <Text style={s.switchText}>
            Already have an account? <Text style={s.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#312e81' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  appTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  appSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, ...shadow.md },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 12, fontSize: 14, color: colors.text, backgroundColor: '#fafafa',
  },
  btn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  switchWrap: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  switchLink: { color: '#fff', fontWeight: '700' },
});
