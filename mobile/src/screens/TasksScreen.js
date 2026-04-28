import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, isOverdue }) {
  const label = isOverdue ? 'Overdue' : status;
  const style = isOverdue ? s.badgeOverdue : status === 'Completed' ? s.badgeCompleted : s.badgePending;
  const textStyle = isOverdue ? s.badgeOverdueText : status === 'Completed' ? s.badgeCompletedText : s.badgePendingText;
  return <View style={[s.badge, style]}><Text style={textStyle}>{label}</Text></View>;
}

function TaskCard({ task, onEdit, onDelete, onComplete, idx }) {
  const effTarget = task.revised_date_5 || task.revised_date_4 || task.revised_date_3 || task.revised_date_2 || task.revised_date_1 || task.initial_target_date;
  return (
    <TouchableOpacity style={s.taskCard} onPress={() => onEdit(task)} activeOpacity={0.9}>
      <View style={s.taskTop}>
        <View style={s.taskNum}><Text style={s.taskNumText}>{idx + 1}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.taskDesc} numberOfLines={2}>{task.task_description}</Text>
          {task.stakeholder ? <Text style={s.taskStakeholder}>👤 {task.stakeholder}</Text> : null}
        </View>
        <StatusBadge status={task.achievement_status} isOverdue={task.is_overdue} />
      </View>

      <View style={s.taskMeta}>
        {task.section ? (
          <View style={s.sectionPill}><Text style={s.sectionPillText}>{task.section}</Text></View>
        ) : null}
        <View style={[s.datePill, task.is_overdue && s.datePillOverdue]}>
          <Text style={[s.datePillText, task.is_overdue && s.datePillOverdueText]}>
            📅 {fmt(effTarget)}
          </Text>
        </View>
        {task.no_of_deviations > 0 ? (
          <View style={s.devPill}><Text style={s.devPillText}>{task.no_of_deviations}x revised</Text></View>
        ) : null}
        {task.score !== null && task.score !== undefined ? (
          <Text style={s.scoreText}>{task.score}/5 ⭐</Text>
        ) : null}
      </View>

      {task.remarks ? <Text style={s.taskRemarks} numberOfLines={1}>{task.remarks}</Text> : null}

      <View style={s.taskActions}>
        {task.achievement_status === 'Pending' && (
          <TouchableOpacity style={s.doneBtn} onPress={() => onComplete(task)}>
            <Text style={s.doneBtnText}>✓ Mark Done</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.editBtn} onPress={() => onEdit(task)}>
          <Text style={s.editBtnText}>✏ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(task)}>
          <Text style={s.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const EMPTY_FORM = {
  task_description: '', stakeholder: '', section: '', sheet_name: 'Sheet 1',
  create_date: new Date().toISOString().split('T')[0], initial_target_date: '',
  revised_date_1: '', revised_date_2: '', revised_date_3: '',
  revised_date_4: '', revised_date_5: '', completion_date: '', remarks: '',
};

function TaskFormModal({ visible, task, sheetName, sections, stakeholders, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      const f = {};
      Object.keys(EMPTY_FORM).forEach(k => {
        f[k] = task[k] ? (typeof task[k] === 'string' && task[k].includes('T') ? task[k].split('T')[0] : String(task[k])) : '';
      });
      setForm(f);
    } else {
      setForm({ ...EMPTY_FORM, sheet_name: sheetName || 'Sheet 1' });
    }
  }, [task, sheetName, visible]);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSave() {
    if (!form.task_description.trim()) { Alert.alert('Error', 'Task description required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (task) await api.updateTask(task.id, payload);
      else await api.createTask(payload);
      onSaved();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  function Field({ label, field, placeholder, multiline, ...rest }) {
    return (
      <View style={s.fieldGroup}>
        <Text style={s.fieldLabel}>{label}</Text>
        <TextInput
          style={[s.fieldInput, multiline && { height: 70, textAlignVertical: 'top' }]}
          value={form[field]}
          onChangeText={v => set(field, v)}
          placeholder={placeholder || ''}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          {...rest}
        />
      </View>
    );
  }

  function PickerField({ label, field, options }) {
    const [open, setOpen] = useState(false);
    return (
      <View style={s.fieldGroup}>
        <Text style={s.fieldLabel}>{label}</Text>
        <TouchableOpacity style={s.fieldInput} onPress={() => setOpen(true)}>
          <Text style={{ color: form[field] ? colors.text : '#9ca3af', fontSize: 14 }}>
            {form[field] || `Select ${label}`}
          </Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={s.pickerOverlay} onPress={() => setOpen(false)}>
            <View style={s.pickerBox}>
              <Text style={s.pickerTitle}>{label}</Text>
              <TouchableOpacity style={s.pickerOption} onPress={() => { set(field, ''); setOpen(false); }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt} style={s.pickerOption} onPress={() => { set(field, opt); setOpen(false); }}>
                  <Text style={{ fontSize: 14, color: form[field] === opt ? colors.primary : colors.text, fontWeight: form[field] === opt ? '700' : '400' }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{task ? 'Edit Task' : 'New Task'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <Field label="Task Description *" field="task_description" placeholder="Enter task..." multiline />
            <PickerField label="Stakeholder" field="stakeholder" options={stakeholders} />
            <PickerField label="Section" field="section" options={sections} />

            <Text style={s.divider}>TARGET DATES</Text>
            <Field label="Initial Target Date" field="initial_target_date" placeholder="YYYY-MM-DD" keyboardType="numeric" />
            <Field label="Revised Date 1" field="revised_date_1" placeholder="YYYY-MM-DD" keyboardType="numeric" />
            <Field label="Revised Date 2" field="revised_date_2" placeholder="YYYY-MM-DD" keyboardType="numeric" />
            <Field label="Revised Date 3" field="revised_date_3" placeholder="YYYY-MM-DD" keyboardType="numeric" />

            <Text style={s.divider}>COMPLETION</Text>
            <Field label="Completion Date" field="completion_date" placeholder="YYYY-MM-DD" keyboardType="numeric" />
            <Field label="Remarks" field="remarks" placeholder="Any notes..." multiline />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={s.modalFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{task ? 'Update' : 'Create Task'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function TasksScreen({ sheetName }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalTask, setModalTask] = useState(undefined);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = { sheet_name: sheetName };
      if (filterStatus) params.status = filterStatus;
      const data = await api.getTasks(params);
      setTasks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [sheetName, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getSections().then(setSections).catch(() => {});
    api.getStakeholders().then(setStakeholders).catch(() => {});
  }, []);

  const filtered = search
    ? tasks.filter(t => t.task_description?.toLowerCase().includes(search.toLowerCase()) || t.stakeholder?.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  function openNew() { setModalTask(null); setShowModal(true); }
  function openEdit(task) { setModalTask(task); setShowModal(true); }
  function closeModal() { setShowModal(false); setModalTask(undefined); }
  function onSaved() { closeModal(); load(); }

  async function handleDelete(task) {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteTask(task.id); load(); } },
    ]);
  }

  async function handleComplete(task) {
    const today = new Date().toISOString().split('T')[0];
    await api.updateTask(task.id, { ...task, completion_date: today });
    load();
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {['', 'Pending', 'Completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, filterStatus === f && s.filterPillActive]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[s.filterPillText, filterStatus === f && s.filterPillTextActive]}>
              {f || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.taskCount}>{filtered.length} tasks</Text>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          renderItem={({ item, index }) => (
            <TaskCard task={item} idx={index} onEdit={openEdit} onDelete={handleDelete} onComplete={handleComplete} />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={s.emptyText}>No tasks found</Text>
              <TouchableOpacity style={s.addBtn} onPress={openNew}>
                <Text style={s.addBtnText}>+ Add First Task</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TaskFormModal
        visible={showModal}
        task={modalTask}
        sheetName={sheetName}
        sections={sections}
        stakeholders={stakeholders}
        onClose={closeModal}
        onSaved={onSaved}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32 },

  topBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  searchInput: { backgroundColor: '#f3f4f6', borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  filterPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterPillTextActive: { color: colors.primary },
  taskCount: { marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  taskCard: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  taskNum: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  taskNumText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  taskDesc: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, lineHeight: 20 },
  taskStakeholder: { fontSize: 12, color: colors.textMuted, marginTop: 3 },

  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeCompleted: { backgroundColor: colors.successLight },
  badgeCompletedText: { fontSize: 11, fontWeight: '600', color: colors.success },
  badgePending: { backgroundColor: colors.warningLight },
  badgePendingText: { fontSize: 11, fontWeight: '600', color: colors.warning },
  badgeOverdue: { backgroundColor: colors.dangerLight },
  badgeOverdueText: { fontSize: 11, fontWeight: '600', color: colors.danger },

  sectionPill: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  sectionPillText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  datePill: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  datePillOverdue: { backgroundColor: colors.dangerLight },
  datePillText: { fontSize: 11, color: '#1d4ed8', fontWeight: '500' },
  datePillOverdueText: { color: colors.danger },
  devPill: { backgroundColor: colors.warningLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  devPillText: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  scoreText: { fontSize: 12, fontWeight: '700', color: colors.success },

  taskRemarks: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  doneBtn: { backgroundColor: colors.successLight, borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  doneBtnText: { fontSize: 12, fontWeight: '700', color: colors.success },
  editBtn: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  deleteBtn: { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: colors.danger },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fafafa' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.text, backgroundColor: '#fafafa', minHeight: 44, justifyContent: 'center' },
  divider: { fontSize: 10, fontWeight: '700', color: '#d1d5db', letterSpacing: 1, marginBottom: 12, marginTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: 400 },
  pickerTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  pickerOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
});
