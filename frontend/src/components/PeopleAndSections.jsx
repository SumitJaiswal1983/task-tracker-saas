import { useState, useEffect } from 'react';
import { api } from '../api';

// ─── Inline modal ───────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── People panel ───────────────────────────────────────────────
function PeoplePanel() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode:'add'} | {mode:'edit', person}
  const [form, setForm] = useState({ name: '', countryCode: '91', localNumber: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [selected, setSelected] = useState(new Set());

  async function load() {
    setLoading(true);
    try { setPeople(await api.getPeopleFull()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function splitNumber(num) {
    if (!num) return { countryCode: '91', localNumber: '' };
    if (num.length > 10) return { countryCode: num.slice(0, num.length - 10), localNumber: num.slice(-10) };
    return { countryCode: '91', localNumber: num };
  }

  function openAdd() { setForm({ name: '', countryCode: '91', localNumber: '' }); setError(''); setModal({ mode: 'add' }); }
  function openEdit(p) {
    const { countryCode, localNumber } = splitNumber(p.whatsapp_number || '');
    setForm({ name: p.name, countryCode, localNumber });
    setError(''); setModal({ mode: 'edit', person: p });
  }
  function closeModal() { setModal(null); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    const whatsapp = form.localNumber.trim() ? (form.countryCode.trim() + form.localNumber.trim()) : null;
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), whatsapp_number: whatsapp };
      if (modal.mode === 'add') await api.createPerson(payload);
      else await api.updatePerson(modal.person.id, payload);
      closeModal(); load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await api.deletePerson(p.id);
    load();
  }

  function openSendModal() {
    const wapeople = people.filter(p => p.whatsapp_number);
    setSelected(new Set(wapeople.map(p => p.id)));
    setSendModal(true);
  }

  async function doSend() {
    if (selected.size === 0) return;
    setSending(true);
    setSendModal(false);
    try {
      const res = await api.sendOverdueReminders(Array.from(selected));
      const sent = res.details?.filter(d => d.status === 'sent') || [];
      const failed = res.details?.filter(d => d.status === 'failed') || [];
      const skipped = res.details?.filter(d => d.status === 'skipped') || [];
      let msg = '';
      if (sent.length) msg += `✅ Sent: ${sent.map(d => d.name).join(', ')}\n`;
      if (failed.length) msg += `❌ Failed: ${failed.map(d => d.name).join(', ')}\n`;
      if (skipped.length) msg += `⏭ No pending tasks: ${skipped.map(d => d.name).join(', ')}`;
      alert(msg.trim() || 'No pending tasks found.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSending(false);
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>People / Stakeholders</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Manage names and WhatsApp numbers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={openSendModal} disabled={sending} style={{ fontSize: 12 }}>
            {sending ? 'Sending...' : '📲 Send Now'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
        </div>
      </div>

      {/* One-time WhatsApp setup card */}
      <div style={{ margin: '12px 16px 0', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d', marginBottom: 4 }}>📲 One-Time WhatsApp Setup</div>
        <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6, marginBottom: 10 }}>
          Share this link with your stakeholders <strong>once</strong>. When they click it and tap Send, daily task reminders will appear directly in their WhatsApp chat — no extra steps needed.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            https://wa.me/919277242391?text=Task+Reminder
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#15803d', color: '#fff', border: 'none', whiteSpace: 'nowrap', fontSize: 12 }}
            onClick={() => {
              navigator.clipboard.writeText('https://wa.me/919277242391?text=Task+Reminder');
              alert('✅ Link copied! Paste it in WhatsApp and send to your stakeholders.');
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : people.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No people added yet</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>WhatsApp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    {p.whatsapp_number
                      ? <span style={{ color: '#2e7d32', fontSize: 13 }}>+{p.whatsapp_number}</span>
                      : <span style={{ color: '#ccc', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sendModal && (() => {
        const wapeople = people.filter(p => p.whatsapp_number);
        const allSelected = wapeople.length > 0 && wapeople.every(p => selected.has(p.id));
        function toggleAll() {
          if (allSelected) setSelected(new Set());
          else setSelected(new Set(wapeople.map(p => p.id)));
        }
        function toggle(id) {
          setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
        }
        return (
          <Modal title="📲 Send WhatsApp Reminders" onClose={() => setSendModal(false)}>
            <div className="modal-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {wapeople.length === 0 ? (
                <div style={{ color: '#888', fontSize: 13 }}>No WhatsApp numbers added yet.</div>
              ) : (
                <>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 6, cursor: 'pointer' }}
                    onClick={toggleAll}
                  >
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Select All</span>
                  </div>
                  {wapeople.map(p => (
                    <div
                      key={p.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}
                      onClick={() => toggle(p.id)}
                    >
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#2e7d32' }}>+{p.whatsapp_number}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSendModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={doSend} disabled={selected.size === 0}>
                Send to {selected.size} {selected.size === 1 ? 'person' : 'people'}
              </button>
            </div>
          </Modal>
        );
      })()}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'New Person' : 'Edit Person'} onClose={closeModal}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {error && <div style={{ color: '#f44336', marginBottom: 10, fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Suraj Kant" />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Number</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 10px', background: '#fafafa', minWidth: 80 }}>
                      <span style={{ color: '#6b7280', fontSize: 14, marginRight: 2 }}>+</span>
                      <input
                        style={{ border: 'none', background: 'transparent', width: 44, fontSize: 14, outline: 'none', padding: '10px 0' }}
                        value={form.countryCode}
                        onChange={e => setForm(f => ({ ...f, countryCode: e.target.value.replace(/\D/g, '') }))}
                        placeholder="91"
                        maxLength={4}
                      />
                    </div>
                    <input
                      className="form-control"
                      style={{ flex: 1 }}
                      value={form.localNumber}
                      onChange={e => setForm(f => ({ ...f, localNumber: e.target.value.replace(/\D/g, '') }))}
                      placeholder="98765 43210"
                      maxLength={15}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: '#888' }}>Leave empty if no WhatsApp reminder needed</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'add' ? 'Add' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Sections panel ─────────────────────────────────────────────
function SectionsPanel() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setSections(await api.getSectionsFull()); } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ name: '' }); setError(''); setModal({ mode: 'add' }); }
  function openEdit(s) { setForm({ name: s.name }); setError(''); setModal({ mode: 'edit', section: s }); }
  function closeModal() { setModal(null); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (modal.mode === 'add') await api.createSection({ name: form.name.trim() });
      else await api.updateSection(modal.section.id, { name: form.name.trim() });
      closeModal(); load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete section "${s.name}"?`)) return;
    await api.deleteSection(s.id);
    load();
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Sections</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Manage task sections and departments</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : sections.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No sections added yet</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Section Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'New Section' : 'Edit Section'} onClose={closeModal}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {error && <div style={{ color: '#f44336', marginBottom: 10, fontSize: 13 }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Section Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ name: e.target.value })} placeholder="e.g. Quality" autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : modal.mode === 'add' ? 'Add' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── WA Message Log ─────────────────────────────────────────────
const STATUS_STYLE = {
  sent:      { bg: '#eff6ff', color: '#1d4ed8', label: '📤 Sent' },
  delivered: { bg: '#f0fdf4', color: '#15803d', label: '✅ Delivered' },
  read:      { bg: '#ecfdf5', color: '#065f46', label: '👁 Read' },
  failed:    { bg: '#fef2f2', color: '#991b1b', label: '❌ Failed' },
};

function WaMessageLog() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function load() {
    try {
      const data = await api.getMessageLog();
      setMessages(data || []);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) return null;
  if (messages.length === 0) return null;

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ padding: '14px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📊 WhatsApp Message Log</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Last 30 days · updates every 30s</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ fontSize: 12 }}>↺ Refresh</button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Stakeholder</th>
              <th>Phone</th>
              <th>Sent At</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, i) => {
              const s = STATUS_STYLE[m.status] || STATUS_STYLE.sent;
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.stakeholder_name}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>+{m.phone}</td>
                  <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(m.sent_at)}</td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    {m.status === 'failed' && m.error_reason && (
                      <div style={{ fontSize: 10, color: '#991b1b', marginTop: 2, maxWidth: 200, wordBreak: 'break-word' }}>
                        {m.error_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {m.status_at ? fmtDate(m.status_at) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────
export default function PeopleAndSections() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3, color: '#111827', letterSpacing: '-0.5px' }}>People & Sections</h2>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>
          Set stakeholders' WhatsApp numbers — a daily reminder will be sent at 9 AM for pending tasks
        </p>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <PeoplePanel />
        <SectionsPanel />
      </div>
      <WaMessageLog />
    </div>
  );
}
