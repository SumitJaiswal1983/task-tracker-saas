import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '785722511551-itug55i0bpmip3gktogi4ni7e8evl86s.apps.googleusercontent.com';

export default function LoginScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [googleInfo, setGoogleInfo] = useState({ name: '', email: '' });

  const [request, response, promptAsync] = Google.useAuthRequest({ webClientId: WEB_CLIENT_ID });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken || response.params?.access_token;
      if (token) handleGoogleToken(token);
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-in Failed', response.error?.message || 'Something went wrong');
    }
  }, [response]);

  async function handleGoogleToken(accessToken) {
    setGLoading(true);
    try {
      const data = await api.googleMobileAuth(accessToken);
      if (data.needs_company) {
        setGoogleToken(accessToken);
        setGoogleInfo({ name: data.name, email: data.email });
        setShowCompanyModal(true);
      } else {
        saveAndLogin(data);
      }
    } catch (err) {
      Alert.alert('Google Sign-in Failed', err.message);
    } finally {
      setGLoading(false);
    }
  }

  async function handleCompanySubmit() {
    if (!companyName.trim()) { Alert.alert('Error', 'Company name required'); return; }
    setGLoading(true);
    try {
      const data = await api.googleMobileAuth(googleToken, companyName);
      saveAndLogin(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setGLoading(false); }
  }

  async function saveAndLogin(data) {
    await AsyncStorage.setItem('tt_token', data.token);
    await AsyncStorage.setItem('tt_user', JSON.stringify(data.user));
    if (data.company) await AsyncStorage.setItem('tt_company', JSON.stringify(data.company));
    onLogin(data.user, data.company);
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { Alert.alert('Error', 'Email and password required'); return; }
    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      await saveAndLogin(data);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally { setLoading(false); }
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

        {/* Google Sign-in */}
        <TouchableOpacity
          style={[s.googleBtn, (!request || gLoading) && { opacity: 0.6 }]}
          onPress={() => promptAsync()}
          disabled={!request || gLoading}
          activeOpacity={0.85}
        >
          {gLoading ? (
            <ActivityIndicator color="#374151" size="small" />
          ) : (
            <>
              <Text style={s.googleIcon}>G</Text>
              <Text style={s.googleBtnText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Email/Password form */}
        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            placeholder="you@company.com" placeholderTextColor="#9ca3af"
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />
          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={s.input} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor="#9ca3af" secureTextEntry
          />
          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onSignup} style={s.switchWrap}>
          <Text style={s.switchText}>
            Don't have an account?{' '}
            <Text style={s.switchLink}>Start 30-day free trial</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Company name modal for new Google users */}
      <Modal visible={showCompanyModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>One last step</Text>
            <Text style={s.modalSub}>Hi {googleInfo.name}! What's your company name?</Text>
            <TextInput
              style={s.modalInput} value={companyName} onChangeText={setCompanyName}
              placeholder="Highflow Industries" placeholderTextColor="#9ca3af"
              autoFocus
            />
            <Text style={s.modalHint}>Signing up as {googleInfo.email}</Text>
            <TouchableOpacity style={s.btn} onPress={handleCompanySubmit} disabled={gLoading} activeOpacity={0.85}>
              {gLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Start Free Trial</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: radius.sm, paddingVertical: 13,
    gap: 10, marginBottom: 16, ...shadow.sm,
  },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSub: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 13, fontSize: 14, color: colors.text, backgroundColor: '#fafafa', marginBottom: 6,
  },
  modalHint: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
});
