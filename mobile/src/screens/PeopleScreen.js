import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl, Share, Clipboard, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

const BACKEND = 'https://task-tracker-backend-production-94c1.up.railway.app';

// ── Person add/edit modal ────────────────────────────────────────
function PersonForm({ visible, person, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [localNumber, setLocalNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(person?.name || '');
    const num = person?.whatsapp_number || '';
    if (num.length > 10) {
      setCountryCode(num.slice(0, num.length - 10));
      setLocalNumber(num.slice(-10));
    } else {
      setCountryCode('91');
      setLocalNumber(num);
    }
  }, [person, visible]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'Name required'); return; }
    const whatsapp = localNumber.trim() ? (countryCode.trim() + localNumber.trim()) : null;
    setSaving(true);
    try {
      const payload = { name: name.trim(), whatsapp_number: whatsapp };
      if (person) await api.updatePerson(person.id, payload);
      else await api.createPerson(payload);
      onSaved();
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{person ? 'Edit Person' : 'Add Person'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Full Name *</Text>
          <TextInput
            style={s.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Suraj Kant"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
          <Text style={[s.fieldLabel, { marginTop: 18 }]}>WhatsApp Number</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, minWidth: 72 }}>
              <Text style={{ fontSize: 14, color: '#6b7280', marginRight: 2 }}>+</Text>
              <TextInput
                style={{ fontSize: 14, color: '#111827', minWidth: 36, padding: 12, paddingLeft: 0 }}
                value={countryCode}
                onChangeText={v => setCountryCode(v.replace(/\D/g, ''))}
                placeholder="91"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <TextInput
              style={[s.fieldInput, { flex: 1 }]}
              value={localNumber}
              onChangeText={v => setLocalNumber(v.replace(/\D/g, ''))}
              placeholder="98765 43210"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={15}
            />
          </View>
          <Text style={s.fieldHint}>Leave empty if no WhatsApp reminder needed</Text>
        </ScrollView>
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
const HOURS = [
  { value: -1, label: '🔕 Off' },
  ...Array.from({ length: 24 }, (_, i) => {
    const ampm = i < 12 ? 'AM' : 'PM';
    const h = i === 0 ? 12 : i > 12 ? i - 12 : i;
    return { value: i, label: `${h}:00 ${ampm}` };
  }),
];

const UPGRADE_PLANS = [
  { label: 'Basic',   mo: '₹199/mo', yr: '₹2,149/yr', wa: '300 WA',  color: '#6b7280' },
  { label: 'Starter', mo: '₹299/mo', yr: '₹3,229/yr', wa: '500 WA',  color: '#4f46e5', popular: true },
  { label: 'Growth',  mo: '₹599/mo', yr: '₹6,469/yr', wa: '1K WA',   color: '#0891b2' },
];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export default function PeopleScreen() {
  const [people, setPeople] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalPerson, setModalPerson] = useState(undefined);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedWaIds, setSelectedWaIds] = useState([]);
  const [tab, setTab] = useState('people');

  // Settings state
  const [settings, setSettings] = useState(null);
  const [notifyHour, setNotifyHour] = useState(9);
  const [notifyDays, setNotifyDays] = useState(DAY_KEYS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [planYearly, setPlanYearly] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, sec, s] = await Promise.all([
        api.getPeopleFull(),
        api.getSectionsFull(),
        api.getSettings().catch(() => null),
      ]);
      setPeople(Array.isArray(p) ? p : []);
      setSections(Array.isArray(sec) ? sec : []);
      if (s) {
        setSettings(s);
        setNotifyHour(s.notify_hour ?? 9);
        setNotifyDays((s.notify_days || 'mon,tue,wed,thu,fri,sat,sun').split(',').map(d => d.trim()));
      }
    } catch (e) {
      console.error('PeopleScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function saveSettings() {
    if (notifyDays.length === 0) { Alert.alert('Error', 'Select at least one day'); return; }
    setSavingSettings(true);
    try {
      await api.saveSettings({ notify_hour: notifyHour, notify_days: notifyDays.join(',') });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSavingSettings(false); }
  }

  function toggleDay(key) {
    setNotifyDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  }

  useEffect(() => { load(); }, [load]);

  function sendNow() {
    const wapeople = people.filter(p => p.whatsapp_number);
    if (wapeople.length === 0) {
      Alert.alert('No WhatsApp numbers', 'Add WhatsApp numbers to people first.');
      return;
    }
    setSelectedWaIds(wapeople.map(p => p.id));
    setShowSendModal(true);
  }

  async function confirmSend() {
    setShowSendModal(false);
    setSending(true);
    try {
      const ids = selectedWaIds.length === people.filter(p => p.whatsapp_number).length
        ? null : selectedWaIds;
      const res = await api.sendOverdueReminders(ids);
      Alert.alert('Done', res.sent > 0
        ? `✅ ${res.sent} reminder(s) sent!`
        : 'No pending tasks or no WhatsApp numbers set.');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSending(false); }
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
        <TouchableOpacity style={[s.tabBtn, tab === 'people' && s.tabBtnActive]} onPress={() => setTab('people')}>
          <Text style={[s.tabBtnText, tab === 'people' && s.tabBtnTextActive]}>👥 People</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'sections' && s.tabBtnActive]} onPress={() => setTab('sections')}>
          <Text style={[s.tabBtnText, tab === 'sections' && s.tabBtnTextActive]}>🏢 Sections</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'settings' && s.tabBtnActive]} onPress={() => setTab('settings')}>
          <Text style={[s.tabBtnText, tab === 'settings' && s.tabBtnTextActive]}>⚙️ Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.waBtn, sending && { opacity: 0.6 }]} onPress={sendNow} disabled={sending}>
          <Text style={s.waBtnText}>{sending ? '...' : '📲 Send'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : tab === 'settings' ? null : tab === 'people' ? (
        <FlatList
          data={people}
          keyExtractor={p => String(p.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          contentContainerStyle={[s.list, people.length === 0 && { flexGrow: 1 }]}
          ListHeaderComponent={
            <>
              {/* One-time WhatsApp setup card */}
              <View style={s.setupCard}>
                <Text style={s.setupTitle}>📲 One-Time WhatsApp Setup</Text>
                <Text style={s.setupDesc}>
                  Share this link with your stakeholders <Text style={{ fontWeight: '700' }}>once</Text>. When they tap it and press Send, daily reminders will go directly to their WhatsApp chat.
                </Text>
                <View style={s.setupRow}>
                  <TouchableOpacity
                    style={[s.setupBtn, { backgroundColor: '#15803d', flex: 1 }]}
                    onPress={() => Share.share({ message: 'Please click this link once to receive your daily task reminders on WhatsApp:\nhttps://wa.me/919277242391?text=Task+Reminder' })}
                  >
                    <Text style={s.setupBtnText}>🔗 Share Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.setupBtn, { backgroundColor: '#374151', marginLeft: 8 }]}
                    onPress={() => { Clipboard.setString('https://wa.me/919277242391?text=Task+Reminder'); Alert.alert('Copied!', 'Link copied to clipboard.'); }}
                  >
                    <Text style={s.setupBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => { setModalPerson(null); setShowPersonModal(true); }}>
                <Text style={s.addBtnText}>+ Add Person</Text>
              </TouchableOpacity>
            </>
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

      {/* Settings tab */}
      {tab === 'settings' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* WA usage */}
          {settings && (
            <View style={s.settingsCard}>
              <Text style={s.settingsCardTitle}>📊 WhatsApp Usage This Month</Text>
              {(() => {
                const sent = settings.wa_messages_sent || 0;
                const limit = settings.wa_limit ?? 100;  // from cached company data (not in settings endpoint currently)
                const pct = limit === -1 ? 0 : Math.min(100, Math.round((sent / (limit || 1)) * 100));
                return (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: '#555' }}>Messages sent</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: pct >= 80 ? '#dc2626' : '#312e81' }}>
                        {sent} / {limit === -1 ? '∞' : limit}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 }}>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: pct >= 80 ? '#dc2626' : '#25d366', width: `${limit === -1 ? 0 : pct}%` }} />
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          {/* Upgrade plans */}
          <View style={s.settingsCard}>
            <Text style={s.settingsCardTitle}>🚀 Upgrade Plan</Text>
            {/* Monthly / Yearly toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 14, alignSelf: 'flex-start' }}>
              <TouchableOpacity
                onPress={() => setPlanYearly(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, backgroundColor: !planYearly ? '#fff' : 'transparent' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: !planYearly ? '#312e81' : '#6b7280' }}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPlanYearly(true)}
                style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, backgroundColor: planYearly ? '#fff' : 'transparent' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: planYearly ? '#312e81' : '#6b7280' }}>Yearly 🏷️</Text>
              </TouchableOpacity>
            </View>
            {planYearly && (
              <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600', marginBottom: 10 }}>Save ~10% with yearly billing</Text>
            )}
            <View style={{ gap: 10 }}>
              {UPGRADE_PLANS.map(p => (
                <TouchableOpacity
                  key={p.label}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem('tt_token');
                    if (!token) { Alert.alert('Error', 'Please login again'); return; }
                    const planKey = (p.label.toLowerCase() + (planYearly ? '_yr' : ''));
                    await WebBrowser.openBrowserAsync(`${BACKEND}/api/payment/mobile-checkout?token=${token}&plan=${planKey}`);
                  }}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    borderWidth: 2, borderColor: p.popular ? p.color : '#e5e7eb',
                    borderRadius: 10, padding: 14,
                    backgroundColor: p.popular ? '#f5f3ff' : '#fff',
                  }}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: p.color }}>{p.label}</Text>
                    <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>💬 {p.wa}/mo</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: p.color }}>{planYearly ? p.yr : p.mo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notification schedule */}
          <View style={s.settingsCard}>
            <Text style={s.settingsCardTitle}>⏰ Notification Schedule</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 14 }}>When to send daily WhatsApp reminders (IST)</Text>

            <Text style={s.settingsLabel}>Send Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h.value}
                  onPress={() => setNotifyHour(h.value)}
                  style={[s.hourChip, notifyHour === h.value && s.hourChipActive]}
                >
                  <Text style={[s.hourChipText, notifyHour === h.value && s.hourChipTextActive]}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.settingsLabel}>Send On Days</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {DAY_KEYS.map(k => (
                <TouchableOpacity
                  key={k}
                  onPress={() => toggleDay(k)}
                  style={[s.dayChip, notifyDays.includes(k) && s.dayChipActive]}
                >
                  <Text style={[s.dayChipText, notifyDays.includes(k) && s.dayChipTextActive]}>{DAY_LABELS[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.saveSettingsBtn, savingSettings && { opacity: 0.6 }]}
              onPress={saveSettings}
              disabled={savingSettings}
            >
              <Text style={s.saveSettingsBtnText}>{savingSettings ? 'Saving...' : settingsSaved ? '✓ Saved!' : 'Save Schedule'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

      {/* WhatsApp send selection modal */}
      <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Send WhatsApp Reminders</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>Select people to send to:</Text>

            {/* Select All row */}
            <TouchableOpacity
              onPress={() => {
                const wapeople = people.filter(p => p.whatsapp_number);
                setSelectedWaIds(selectedWaIds.length === wapeople.length ? [] : wapeople.map(p => p.id));
              }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: selectedWaIds.length === people.filter(p => p.whatsapp_number).length ? colors.primary : '#fff', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                {selectedWaIds.length === people.filter(p => p.whatsapp_number).length && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Select All</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300 }}>
              {people.filter(p => p.whatsapp_number).map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedWaIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: selectedWaIds.includes(p.id) ? colors.primary : '#fff', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                    {selectedWaIds.includes(p.id) && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{p.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>+{p.whatsapp_number}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowSendModal(false)} style={{ flex: 1, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSend}
                disabled={selectedWaIds.length === 0}
                style={{ flex: 1, padding: 14, borderRadius: radius.sm, backgroundColor: selectedWaIds.length === 0 ? '#9ca3af' : '#25D366', alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Send ({selectedWaIds.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  setupCard: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14, marginBottom: 12 },
  setupTitle: { fontSize: 13, fontWeight: '800', color: '#15803d', marginBottom: 6 },
  setupDesc: { fontSize: 12, color: '#166534', lineHeight: 18, marginBottom: 10 },
  setupRow: { flexDirection: 'row' },
  setupBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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

  settingsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  settingsCardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
  settingsLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  hourChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  hourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  hourChipTextActive: { color: '#fff' },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayChipTextActive: { color: '#fff' },
  saveSettingsBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveSettingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, fontSize: 14, color: colors.text, backgroundColor: '#fafafa' },
  fieldHint: { fontSize: 11, color: colors.textMuted, marginTop: 5 },

  sectionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sectionModalBox: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, ...shadow.md },
});
