import { useState, useEffect } from 'react';
import { api } from '../api';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM';
  const h = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${h}:00 ${ampm}` };
});

const PLAN_LABELS = {
  trial:      'Trial',
  basic:      'Basic (₹199/mo · 300 WA)',
  starter:    'Starter (₹299/mo · 500 WA)',
  growth:     'Growth (₹1,000/mo · 1,500 WA)',
  pro:        'Pro (₹2,000/mo · 3,000 WA)',
  basic_yr:   'Basic Yearly (₹2,149/yr · 3,600 WA)',
  starter_yr: 'Starter Yearly (₹3,229/yr · 6,000 WA)',
  growth_yr:  'Growth Yearly (₹10,800/yr · 18,000 WA)',
  pro_yr:     'Pro Yearly (₹21,600/yr · 36,000 WA)',
  monthly:    'Starter (₹299/mo · 500 WA)',
  yearly:     'Legacy Yearly (₹6,999/yr)',
};

function UsageBar({ used, limit, label, color = '#312e81' }) {
  const pct = limit === -1 ? 0 : limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = limit !== -1 && pct >= 80;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#444', fontWeight: 500 }}>{label}</span>
        <span style={{ color: warn ? '#dc2626' : '#555', fontWeight: 600 }}>
          {used} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
        <div style={{
          height: 6, borderRadius: 3,
          width: limit === -1 ? '0%' : `${pct}%`,
          background: warn ? '#dc2626' : color,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

export default function Settings({ company, onCompanyUpdate }) {
  const [settings, setSettings] = useState(null);
  const [notifyHour, setNotifyHour] = useState(9);
  const [notifyDays, setNotifyDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSettings().then(s => {
      if (s) {
        setSettings(s);
        setNotifyHour(s.notify_hour ?? 9);
        setNotifyDays((s.notify_days || 'mon,tue,wed,thu,fri,sat,sun').split(',').map(d => d.trim()));
      }
    }).catch(() => {});
  }, []);

  function toggleDay(key) {
    setNotifyDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    if (notifyDays.length === 0) { setError('Select at least one day'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.saveSettings({ notify_hour: notifyHour, notify_days: notifyDays.join(',') });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  const isPaid = company?.subscription_active;
  const planLabel = PLAN_LABELS[company?.plan] || company?.plan || 'Trial';
  const waLimit = company?.wa_limit ?? 100;
  const waSent = company?.wa_messages_sent ?? 0;
  const maxUsers = company?.max_users ?? 3;
  const maxStakeholders = company?.max_stakeholders ?? 10;
  const maxTasks = company?.max_tasks ?? 200;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

      {/* Plan & Limits */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Plan & Usage</h3>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
            background: isPaid ? '#dcfce7' : '#fef3c7', color: isPaid ? '#166534' : '#92400e',
          }}>
            {isPaid ? planLabel : 'Trial'}
          </span>
        </div>
        <div className="card-body">
          {!isPaid && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              Trial limits: {maxUsers} users · {maxStakeholders} stakeholders · {maxTasks} tasks · {waLimit} WA messages/month
            </div>
          )}
          <UsageBar used={waSent} limit={waLimit} label="WhatsApp Messages (this month)" color="#25d366" />
          {!isPaid && (
            <>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginTop: 4 }}>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                  Upgrade for unlimited users, tasks & stakeholders + more WA messages/month:
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { plan: 'basic',   label: '₹199/mo',    sub: '300 WA/mo' },
                    { plan: 'starter', label: '₹299/mo',    sub: '500 WA/mo', highlight: true },
                    { plan: 'growth',  label: '₹1,000/mo',  sub: '1,500 WA/mo' },
                    { plan: 'pro',     label: '₹2,000/mo',  sub: '3,000 WA/mo' },
                    { plan: 'pro_yr',  label: '₹21,600/yr', sub: '36,000 WA/yr — 10% off' },
                  ].map(p => (
                    <div key={p.plan} style={{
                      border: `2px solid ${p.highlight ? '#312e81' : '#e5e7eb'}`,
                      borderRadius: 10, padding: '10px 14px', minWidth: 120, textAlign: 'center',
                      background: p.highlight ? '#f5f3ff' : '#fff',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#312e81' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{p.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {isPaid && (
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              Unlimited users, stakeholders & tasks. WA messages: {waLimit === -1 ? 'Unlimited' : `${waLimit}/month`}.
              {company?.paid_until && (
                <span style={{ marginLeft: 8, color: '#312e81', fontWeight: 600 }}>
                  Renews: {new Date(company.paid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notification Schedule */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notification Schedule</h3>
          <span style={{ fontSize: 12, color: '#666' }}>Daily WhatsApp reminders</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="form-label">Send Time (IST)</label>
              <select
                className="form-control"
                style={{ maxWidth: 200 }}
                value={notifyHour}
                onChange={e => setNotifyHour(Number(e.target.value))}
              >
                {HOURS.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Messages will be sent at this time to all stakeholders with pending tasks.
              </p>
            </div>

            <div>
              <label className="form-label">Send On Days</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {DAYS.map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      border: `2px solid ${notifyDays.includes(d.key) ? '#312e81' : '#e5e7eb'}`,
                      background: notifyDays.includes(d.key) ? '#312e81' : '#fff',
                      color: notifyDays.includes(d.key) ? '#fff' : '#555',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{d.label}</button>
                ))}
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
              {saved && <span style={{ color: '#4caf50', fontSize: 13, fontWeight: 600 }}>✓ Saved!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
