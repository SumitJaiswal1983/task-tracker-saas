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
    if (!form.name.trim()) { setError('Naam required'); return; }
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
    if (!window.confirm(`"${p.name}" ko delete karein?`)) return;
    await api.deletePerson(p.id);
    load();
  }

  async function sendNow() {
    if (!window.confirm('Abhi sabko WhatsApp reminder bhejein?')) return;
    setSending(true);
    try {
      const res = await api.sendOverdueReminders();
      alert(res.sent > 0
        ? `✅ ${res.sent} reminder(s) bheje gaye!`
        : 'Koi overdue task nahi mili ya WhatsApp number set nahi hai.');
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
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Naam aur WhatsApp number manage karein</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={sendNow} disabled={sending} style={{ fontSize: 12 }}>
            {sending ? 'Sending...' : '📲 Send Now'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : people.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>Koi person nahi hai</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Naam</th>
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
                  <span style={{ fontSize: 11, color: '#888' }}>Khali chhodo agar WhatsApp nahi bhejni</span>
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
    if (!form.name.trim()) { setError('Naam required'); return; }
    setSaving(true); setError('');
    try {
      if (modal.mode === 'add') await api.createSection({ name: form.name.trim() });
      else await api.updateSection(modal.section.id, { name: form.name.trim() });
      closeModal(); load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete(s) {
    if (!window.confirm(`"${s.name}" section delete karein?`)) return;
    await api.deleteSection(s.id);
    load();
  }

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Sections / Departments</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Task sections manage karein</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add</button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : sections.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#bbb', fontSize: 13 }}>Koi section nahi hai</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Section Naam</th>
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
                <label className="form-label">Section Naam *</label>
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

// ─── Main page ──────────────────────────────────────────────────
export default function PeopleAndSections() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3, color: '#111827', letterSpacing: '-0.5px' }}>People & Sections</h2>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>
          Stakeholders ke WhatsApp numbers set karein — roz 9 AM par pending tasks ka reminder jaayega
        </p>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <PeoplePanel />
        <SectionsPanel />
      </div>
    </div>
  );
}
