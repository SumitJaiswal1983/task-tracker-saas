import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Modal, ScrollView, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

const ROLES = ['viewer', 'admin'];

// ── User form modal ────────────────────────────────────────────────
function UserForm({ visible, user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer', whatsapp_number: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '', password: '', role: user.role || 'viewer', whatsapp_number: user.whatsapp_number || '' });
    else setForm({ name: '', email: '', password: '', role: 'viewer', whatsapp_number: '' });
  }, [user, visible]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { Alert.alert('Error', 'Name and email required'); return; }
    if (!user && !form.password.trim()) { Alert.alert('Error', 'Password required for new user'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, whatsapp_number: form.whatsapp_number.trim() || null };
      if (form.password.trim()) payload.password = form.password.trim();
      if (user) await api.updateUser(user.id, payload);
      else await api.createUser(payload);
      onSaved();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{user ? 'Edit User' : 'Add User'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Full Name *</Text>
          <TextInput style={s.fieldInput} value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Rohit Sharma" placeholderTextColor="#9ca3af" />

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Email *</Text>
          <TextInput style={s.fieldInput} value={form.email} onChangeText={v => set('email', v)} placeholder="user@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>{user ? 'New Password (leave blank to keep)' : 'Password *'}</Text>
          <TextInput style={s.fieldInput} value={form.password} onChangeText={v => set('password', v)} placeholder="••••••••" placeholderTextColor="#9ca3af" secureTextEntry />

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Role</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[s.roleBtn, form.role === r && s.roleBtnActive]}
                onPress={() => set('role', r)}
              >
                <Text style={[s.roleBtnText, form.role === r && s.roleBtnTextActive]}>
                  {r === 'admin' ? '👑 Admin' : '👤 Viewer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>WhatsApp Number (optional)</Text>
          <TextInput style={s.fieldInput} value={form.whatsapp_number} onChangeText={v => set('whatsapp_number', v.replace(/\D/g, ''))} placeholder="919876543210" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
          <View style={{ height: 20 }} />
        </ScrollView>
        <View style={s.modalFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{user ? 'Update' : 'Add User'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main settings screen ───────────────────────────────────────────
export default function SettingsScreen({ user, company, onLogout }) {
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (isAdmin) api.getUsers().then(setUsers).catch(() => {});
  }, [isAdmin]);

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); onLogout(); } },
    ]);
  }

  async function deleteUser(u) {
    Alert.alert('Delete User', `Delete "${u.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteUser(u.id); api.getUsers().then(setUsers).catch(() => {}); } },
    ]);
  }

  function openWebApp() {
    Linking.openURL('https://task-tracker-saas.onrender.com').catch(() => Alert.alert('Error', 'Could not open browser'));
  }

  const daysLeft = company?.days_remaining;
  const isActive = company?.subscription_active;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
        {/* User card */}
        <View style={[s.card, { marginBottom: 16 }]}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{user?.role === 'admin' ? '👑 Admin' : user?.role === 'superadmin' ? '⚡ Super Admin' : '👤 Member'}</Text>
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
                <Text style={[s.infoValue, { color: colors.warning }]}>🕐 Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</Text>
              )}
            </View>
          </View>
        )}

        {/* Web App link */}
        <TouchableOpacity style={s.webBtn} onPress={openWebApp} activeOpacity={0.85}>
          <View style={{ flex: 1 }}>
            <Text style={s.webBtnTitle}>🌐 Open Web Dashboard</Text>
            <Text style={s.webBtnSub}>Full reports, payments & settings on desktop</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 18 }}>→</Text>
        </TouchableOpacity>

        {/* Team / Users management (admin only) */}
        {isAdmin && (
          <View style={[s.infoCard, { marginBottom: 16 }]}>
            <View style={[s.infoRow, { justifyContent: 'space-between' }]}>
              <Text style={[s.infoLabel, { fontSize: 14, fontWeight: '700', color: colors.text }]}>👥 Team Members</Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 }}
                onPress={() => { setEditUser(null); setShowUserForm(true); }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {users.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, padding: 16, textAlign: 'center' }}>No team members yet</Text>
            ) : users.map(u => (
              <View key={u.id} style={[s.infoRow, { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{u.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{u.email} · {u.role}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#f3f4f6', padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' }}
                    onPress={() => { setEditUser(u); setShowUserForm(true); }}
                  >
                    <Text style={{ fontSize: 13 }}>✏</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.dangerLight, padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}
                    onPress={() => deleteUser(u)}
                  >
                    <Text style={{ fontSize: 13, color: colors.danger }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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

        <View style={{ height: 32 }} />
      </ScrollView>

      <UserForm
        visible={showUserForm}
        user={editUser}
        onClose={() => setShowUserForm(false)}
        onSaved={() => { setShowUserForm(false); api.getUsers().then(setUsers).catch(() => {}); }}
      />
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

  webBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: radius.md, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.primary, ...shadow.sm,
  },
  webBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  webBtnSub: { fontSize: 12, color: colors.textMuted },

  logoutBtn: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },

  // Modal styles
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fafafa' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, fontSize: 14, color: colors.text, backgroundColor: '#fafafa' },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6', alignItems: 'center' },
  roleBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  roleBtnTextActive: { color: colors.primary },
});
