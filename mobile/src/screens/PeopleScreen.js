import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

// ── Person add/edit modal ────────────────────────────────────────
function PersonForm({ visible, person, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', whatsapp_number: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: person?.name || '', whatsapp_number: person?.whatsapp_number || '' });
  }, [person, visible]);

  async function handleSave() {
    if (!form.name.trim()) { Alert.alert('Error', 'Name required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), whatsapp_number: form.whatsapp_number.trim() || null };
      if (person) await api.updatePerson(person.id, payload);
      else await api.createPerson(payload);
      onSaved();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{person ? 'Edit Person' : 'Add Person'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={s.fieldLabel}>Full Name *</Text>
            <TextInput
              style={s.fieldInput}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Suraj Kant"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <Text style={[s.fieldLabel, { marginTop: 18 }]}>WhatsApp Number</Text>
            <TextInput
              style={s.fieldInput}
              value={form.whatsapp_number}
              onChangeText={v => setForm(f => ({ ...f, whatsapp_number: v }))}
              placeholder="919876543210 (with country code)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
            />
            <Text style={s.fieldHint}>Leave empty if no WhatsApp reminder needed</Text>
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={s.modalFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>{person ? 'Update' : 'Add Person'}</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Section add modal (Android-safe, no Alert.prompt) ────────────
function SectionForm({ visible, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) setName(''); }, [visible]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'Section name required'); return; }
    setSaving(true);
    try {
      await api.createSection({ name: name.trim() });
      onSaved();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.sectionModalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sectionModalBox}>
            <Text style={s.modalTitle}>New Section</Text>
            <TextInput
              style={[s.fieldInput, { marginTop: 16 }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Quality, Assembly..."
              placeholderTextColor="#9ca3af"
              autoFocus
              onSubmitEditing={handleSave}
            />
            <View style={[s.modalFooter, { marginTop: 16, paddingHorizontal: 0, paddingBottom: 0, borderTopWidth: 0, backgroundColor: 'transparent' }]}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Add Section</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function PeopleScreen() {
  const [people, setPeople] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalPerson, setModalPerson] = useState(undefined);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('people');

  const load = useCallback(async () => {
    try {
      const [p, sec] = await Promise.all([
        api.getPeopleFull(),
        api.getSectionsFull(),
      ]);
      setPeople(Array.isArray(p) ? p : []);
      setSections(Array.isArray(sec) ? sec : []);
    } catch (e) {
      console.error('PeopleScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendNow() {
    Alert.alert('Send WhatsApp', 'Send reminders to all stakeholders now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          setSending(true);
          try {
            const res = await api.sendOverdueReminders();
            Alert.alert('Done', res.sent > 0
              ? `✅ ${res.sent} reminder(s) sent!`
              : 'No pending tasks or no WhatsApp numbers set.');
          } catch (e) { Alert.alert('Error', e.message); }
          finally { setSending(false); }
        }
      }
    ]);
  }

  async function deletePerson(p) {
    Alert.alert('Delete', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deletePerson(p.id); load(); } },
    ]);
  }

  async function deleteSection(sec) {
    Alert.alert('Delete Section', `Delete "${sec.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteSection(sec.id); load(); } },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Tab switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'people' && s.tabBtnActive]}
          onPress={() => setTab('people')}
        >
          <Text style={[s.tabBtnText, tab === 'people' && s.tabBtnTextActive]}>👥 People</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'sections' && s.tabBtnActive]}
          onPress={() => setTab('sections')}
        >
          <Text style={[s.tabBtnText, tab === 'sections' && s.tabBtnTextActive]}>🏢 Sections</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.waBtn, sending && { opacity: 0.6 }]}
          onPress={sendNow}
          disabled={sending}
        >
          <Text style={s.waBtnText}>{sending ? '...' : '📲 Send'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : tab === 'people' ? (
        <FlatList
          data={people}
          keyExtractor={p => String(p.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          contentContainerStyle={[s.list, people.length === 0 && { flexGrow: 1 }]}
          ListHeaderComponent={
            <TouchableOpacity style={s.addBtn} onPress={() => { setModalPerson(null); setShowPersonModal(true); }}>
              <Text style={s.addBtnText}>+ Add Person</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={s.itemCard}>
              <View style={s.itemAvatar}>
                <Text style={s.itemAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemSub}>
                  {item.whatsapp_number ? `📱 +${item.whatsapp_number}` : 'No WhatsApp number'}
                </Text>
              </View>
              <View style={s.itemActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => { setModalPerson(item); setShowPersonModal(true); }}>
                  <Text style={s.editBtnText}>✏</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => deletePerson(item)}>
                  <Text style={s.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>👥</Text>
              <Text style={s.emptyText}>No people added yet.</Text>
              <Text style={s.emptySubText}>Tap "+ Add Person" above to add stakeholders.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          contentContainerStyle={[s.list, sections.length === 0 && { flexGrow: 1 }]}
          ListHeaderComponent={
            <TouchableOpacity style={s.addBtn} onPress={() => setShowSectionModal(true)}>
              <Text style={s.addBtnText}>+ Add Section</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={s.itemCard}>
              <View style={[s.itemAvatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 18 }}>🏢</Text>
              </View>
              <Text style={[s.itemName, { flex: 1 }]}>{item.name}</Text>
              <TouchableOpacity style={s.deleteBtn} onPress={() => deleteSection(item)}>
                <Text style={s.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🏢</Text>
              <Text style={s.emptyText}>No sections yet.</Text>
              <Text style={s.emptySubText}>Tap "+ Add Section" to create one.</Text>
            </View>
          }
        />
      )}

      <PersonForm
        visible={showPersonModal}
        person={modalPerson}
        onClose={() => { setShowPersonModal(false); setModalPerson(undefined); }}
        onSaved={() => { setShowPersonModal(false); setModalPerson(undefined); load(); }}
      />
      <SectionForm
        visible={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        onSaved={() => { setShowSectionModal(false); load(); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32 },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center',
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm, backgroundColor: '#f3f4f6' },
  tabBtnActive: { backgroundColor: colors.primaryLight },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabBtnTextActive: { color: colors.primary },
  waBtn: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm },
  waBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 13, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  itemCard: {
    backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...shadow.sm, borderWidth: 1, borderColor: colors.border,
  },
  itemAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemAvatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#f3f4f6', padding: 9, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  editBtnText: { fontSize: 15, color: colors.textMuted },
  deleteBtn: { backgroundColor: colors.dangerLight, padding: 9, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { fontSize: 15, color: colors.danger },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },

  // Modals
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 20, color: colors.textMuted, padding: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fafafa' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, fontSize: 14, color: colors.text, backgroundColor: '#fafafa' },
  fieldHint: { fontSize: 11, color: colors.textMuted, marginTop: 5 },

  sectionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sectionModalBox: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, ...shadow.md },
});
