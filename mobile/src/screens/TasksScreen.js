import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
  Modal, ScrollView, Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow, radius } from '../theme';
import { api } from '../api';

function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Reusable field components (defined OUTSIDE modals to prevent keyboard dismissal) ──

function Field({ label, value, onChange, placeholder, multiline, style, ...rest }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }, style]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

function PickerField({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity style={[s.fieldInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? colors.text : '#9ca3af', fontSize: 14 }}>
          {value || `Select ${label}`}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.pickerBox}>
            <Text style={s.pickerTitle}>{label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={s.pickerOption} onPress={() => { onChange(''); setOpen(false); }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt} style={s.pickerOption} onPress={() => { onChange(opt); setOpen(false); }}>
                  <Text style={{ fontSize: 14, color: value === opt ? colors.primary : colors.text, fontWeight: value === opt ? '700' : '400' }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function DateField({ label, value, onChange, maxToday }) {
  const [show, setShow] = useState(false);
  const today = new Date();
  const dateObj = value ? new Date(value + 'T12:00:00') : today;

  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          style={[s.fieldInput, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={() => setShow(true)}
        >
          <Text style={{ color: value ? colors.text : '#9ca3af', fontSize: 14 }}>
            {value ? fmt(value) : 'Select date'}
          </Text>
          <Text style={{ fontSize: 16 }}>📅</Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} style={{ padding: 10, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          maximumDate={maxToday ? today : undefined}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) onChange(selectedDate.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

// ── Task card ──────────────────────────────────────────────────────

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
        {task.section ? <View style={s.sectionPill}><Text style={s.sectionPillText}>{task.section}</Text></View> : null}
        <View style={[s.datePill, task.is_overdue && s.datePillOverdue]}>
          <Text style={[s.datePillText, task.is_overdue && s.datePillOverdueText]}>📅 {fmt(effTarget)}</Text>
        </View>
        {task.no_of_deviations > 0 ? <View style={s.devPill}><Text style={s.devPillText}>{task.no_of_deviations}x revised</Text></View> : null}
        {task.score != null ? <Text style={s.scoreText}>{task.score}/5 ⭐</Text> : null}
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

// ── Task form modal ────────────────────────────────────────────────

const EMPTY_FORM = {
  task_description: '', stakeholder: '', section: '', sheet_name: 'Sheet 1',
  create_date: new Date().toISOString().split('T')[0], initial_target_date: '',
  revised_date_1: '', revised_date_2: '', revised_date_3: '',
  revised_date_4: '', revised_date_5: '', completion_date: '', remarks: '',
  is_recurring: false, recur_interval: 'weekly',
};

function SubtasksTab({ taskId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.getSubtasks(taskId).then(setSubtasks).catch(() => {});
  }, [taskId]);

  async function add() {
    if (!newDesc.trim()) return;
    setAdding(true);
    try {
      const st = await api.addSubtask(taskId, newDesc.trim());
      setSubtasks(prev => [...prev, st]);
      setNewDesc('');
    } finally { setAdding(false); }
  }

  async function toggle(st) {
    const updated = await api.toggleSubtask(taskId, st.id, !st.is_done);
    setSubtasks(prev => prev.map(s => s.id === st.id ? updated : s));
  }

  async function remove(id) {
    await api.deleteSubtask(taskId, id);
    setSubtasks(prev => prev.filter(s => s.id !== id));
  }

  const done = subtasks.filter(s => s.is_done).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {subtasks.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: '#666' }}>{done}/{subtasks.length} completed</Text>
          <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginTop: 4 }}>
            <View style={{ height: 4, backgroundColor: '#4caf50', borderRadius: 2, width: `${subtasks.length ? done / subtasks.length * 100 : 0}%` }} />
          </View>
        </View>
      )}
      {subtasks.map(st => (
        <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <TouchableOpacity onPress={() => toggle(st)} style={{ marginRight: 10 }}>
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: st.is_done ? '#4caf50' : '#9ca3af', backgroundColor: st.is_done ? '#4caf50' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
              {st.is_done && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
            </View>
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 14, color: st.is_done ? '#aaa' : '#222', textDecorationLine: st.is_done ? 'line-through' : 'none' }}>{st.description}</Text>
          <TouchableOpacity onPress={() => remove(st.id)}><Text style={{ color: '#f44336', fontSize: 16, paddingLeft: 8 }}>✕</Text></TouchableOpacity>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }}
          value={newDesc}
          onChangeText={setNewDesc}
          placeholder="Add subtask..."
          onSubmitEditing={add}
        />
        <TouchableOpacity
          onPress={add}
          disabled={adding || !newDesc.trim()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function CommentsTab({ taskId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.getComments(taskId).then(setComments).catch(() => {});
  }, [taskId]);

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const c = await api.addComment(taskId, text.trim());
      setComments(prev => [...prev, c]);
      setText('');
    } finally { setPosting(false); }
  }

  function fmtTs(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {comments.length === 0 && <Text style={{ textAlign: 'center', color: '#aaa', marginVertical: 20 }}>No comments yet</Text>}
      {comments.map(c => (
        <View key={c.id} style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#312e81' }}>{c.user_name || 'Unknown'}</Text>
            <Text style={{ fontSize: 11, color: '#aaa' }}>{fmtTs(c.created_at)}</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#333' }}>{c.comment}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment..."
          onSubmitEditing={post}
        />
        <TouchableOpacity
          onPress={post}
          disabled={posting || !text.trim()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Post</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function TaskFormModal({ visible, task, sheetName, sections, stakeholders, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      const f = {};
      Object.keys(EMPTY_FORM).forEach(k => {
        if (k === 'is_recurring') { f[k] = task[k] === true || task[k] === 'true'; return; }
        f[k] = task[k] ? (typeof task[k] === 'string' && task[k].includes('T') ? task[k].split('T')[0] : String(task[k])) : (k === 'recur_interval' ? 'weekly' : '');
      });
      setForm(f);
    } else {
      setForm({ ...EMPTY_FORM, sheet_name: sheetName || 'Sheet 1' });
    }
    setActiveTab('details');
  }, [task, sheetName, visible]);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSave() {
    if (!form.task_description.trim()) { Alert.alert('Error', 'Task description required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (!payload.is_recurring) payload.recur_interval = null;
      if (task) await api.updateTask(task.id, payload);
      else await api.createTask(payload);
      onSaved();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const RECUR_OPTIONS = ['daily', 'weekly', 'monthly'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{task ? 'Edit Task' : 'New Task'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
        </View>

        {task && (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            {['details', 'subtasks', 'comments'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? colors.primary : 'transparent' }}
              >
                <Text style={{ fontSize: 13, fontWeight: activeTab === tab ? '700' : '400', color: activeTab === tab ? colors.primary : '#666', textTransform: 'capitalize' }}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'details' && (
          <>
            <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
              <Field
                label="Task Description *"
                value={form.task_description}
                onChange={v => set('task_description', v)}
                placeholder="Enter task..."
                multiline
              />
              <PickerField label="Stakeholder" value={form.stakeholder} onChange={v => set('stakeholder', v)} options={stakeholders} />
              <PickerField label="Section" value={form.section} onChange={v => set('section', v)} options={sections} />

              <Text style={s.divider}>TARGET DATES</Text>
              <DateField label="Initial Target Date" value={form.initial_target_date} onChange={v => set('initial_target_date', v)} />
              <DateField label="Revised Date 1" value={form.revised_date_1} onChange={v => set('revised_date_1', v)} />
              <DateField label="Revised Date 2" value={form.revised_date_2} onChange={v => set('revised_date_2', v)} />
              <DateField label="Revised Date 3" value={form.revised_date_3} onChange={v => set('revised_date_3', v)} />

              <Text style={s.divider}>COMPLETION</Text>
              <DateField label="Completion Date" value={form.completion_date} onChange={v => set('completion_date', v)} maxToday />
              <Field label="Remarks" value={form.remarks} onChange={v => set('remarks', v)} placeholder="Any notes..." multiline />

              <Text style={s.divider}>RECURRING</Text>
              <TouchableOpacity
                onPress={() => set('is_recurring', !form.is_recurring)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form.is_recurring ? colors.primary : '#9ca3af', backgroundColor: form.is_recurring ? colors.primary : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  {form.is_recurring && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 14, color: '#333' }}>Recurring task (auto-creates next on completion)</Text>
              </TouchableOpacity>

              {form.is_recurring && (
                <PickerField
                  label="Repeat Every"
                  value={form.recur_interval}
                  onChange={v => set('recur_interval', v)}
                  options={RECUR_OPTIONS}
                />
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{task ? 'Update Task' : 'Create Task'}</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'subtasks' && task && <SubtasksTab taskId={task.id} />}
        {activeTab === 'comments' && task && <CommentsTab taskId={task.id} />}
      </SafeAreaView>
    </Modal>
  );
}

// ── Filter picker modal ────────────────────────────────────────────

function FilterPicker({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[s.filterChip, value && s.filterChipActive]}
        onPress={() => setOpen(true)}
      >
        <Text style={[s.filterChipText, value && s.filterChipTextActive]} numberOfLines={1}>
          {value || label} ▼
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.pickerBox}>
            <Text style={s.pickerTitle}>{label}</Text>
            <ScrollView>
              <TouchableOpacity style={s.pickerOption} onPress={() => { onChange(''); setOpen(false); }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>— All —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt} style={s.pickerOption} onPress={() => { onChange(opt); setOpen(false); }}>
                  <Text style={{ fontSize: 14, color: value === opt ? colors.primary : colors.text, fontWeight: value === opt ? '700' : '400' }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Main Tasks screen ──────────────────────────────────────────────

export default function TasksScreen({ sheetName, taskFilter }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [modalTask, setModalTask] = useState(undefined);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (taskFilter) {
      setFilterStatus(taskFilter.status ?? '');
      setFilterPerson(taskFilter.stakeholder ?? '');
      setFilterSection('');
      setSearch('');
    }
  }, [taskFilter]);

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
    api.getSections().then(d => setSections(d.map(x => x.name || x))).catch(() => {});
    api.getStakeholders().then(d => setStakeholders(d.map(x => x.name || x))).catch(() => {});
  }, []);

  const filtered = tasks.filter(t => {
    if (filterSection && t.section !== filterSection) return false;
    if (filterPerson && t.stakeholder !== filterPerson) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.task_description?.toLowerCase().includes(q) || t.stakeholder?.toLowerCase().includes(q);
    }
    return true;
  });

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

  async function handleExport() {
    try {
      const headers = 'Task,Stakeholder,Section,Sheet,Status,Due Date,Completion Date,Score,Remarks';
      const rows = filtered.map(t => [
        `"${(t.task_description || '').replace(/"/g, '""')}"`,
        `"${(t.stakeholder || '').replace(/"/g, '""')}"`,
        `"${(t.section || '').replace(/"/g, '""')}"`,
        `"${(t.sheet_name || '').replace(/"/g, '""')}"`,
        t.achievement_status || '',
        t.initial_target_date || '',
        t.completion_date || '',
        t.score ?? '',
        `"${(t.remarks || '').replace(/"/g, '""')}"`,
      ].join(',')).join('\n');
      await Share.share({ message: headers + '\n' + rows, title: 'Tasks Export' });
    } catch (err) {
      Alert.alert('Export Error', err.message);
    }
  }

  const hasFilters = filterSection || filterPerson;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks..."
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={s.exportBtn} onPress={handleExport}>
          <Text style={s.exportBtnText}>⬇ CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter pills */}
      <View style={s.filterRow}>
        {['', 'Pending', 'Completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, filterStatus === f && s.filterPillActive]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[s.filterPillText, filterStatus === f && s.filterPillTextActive]}>{f || 'All'}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.taskCount}>{filtered.length} tasks</Text>
      </View>

      {/* Section / Person filters */}
      <View style={s.filterRow2}>
        <FilterPicker label="All Sections" value={filterSection} onChange={setFilterSection} options={sections} />
        <FilterPicker label="All People" value={filterPerson} onChange={setFilterPerson} options={stakeholders} />
        {hasFilters && (
          <TouchableOpacity onPress={() => { setFilterSection(''); setFilterPerson(''); }} style={s.clearBtn}>
            <Text style={s.clearBtnText}>✕ Clear</Text>
          </TouchableOpacity>
        )}
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
          keyboardShouldPersistTaps="handled"
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

  topBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: radius.sm, padding: 10, fontSize: 14, color: colors.text },
  exportBtn: { backgroundColor: '#f3f4f6', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  exportBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  filterPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterPillTextActive: { color: colors.primary },
  taskCount: { marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  filterRow2: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { flex: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: '#ede9fe', borderColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primary },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  clearBtnText: { fontSize: 11, color: colors.danger, fontWeight: '600' },

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
