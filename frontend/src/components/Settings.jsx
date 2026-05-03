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

const PLANS = [
  {
    key: 'basic', yearlyKey: 'basic_yr',
    label: 'Basic',
    price: 199, yearlyPrice: 2149, effectiveMonthly: 179,
    wa: 300, waYearly: 3600,
    color: '#6b7280', accent: '#f9fafb',
  },
  {
    key: 'starter', yearlyKey: 'starter_yr',
    label: 'Starter',
    price: 299, yearlyPrice: 3229, effectiveMonthly: 269,
    wa: 500, waYearly: 6000,
    color: '#4f46e5', accent: '#f5f3ff',
    popular: true,
  },
  {
    key: 'growth', yearlyKey: 'growth_yr',
    label: 'Growth',
    price: 599, yearlyPrice: 6469, effectiveMonthly: 539,
    wa: 1000, waYearly: 12000,
    color: '#0891b2', accent: '#ecfeff',
  },
];

const PLAN_LABELS = {
  trial:      'Trial',
  basic:      'Basic · 300 WA/mo',
  starter:    'Starter · 500 WA/mo',
  growth:     'Growth · 1,000 WA/mo',
  basic_yr:   'Basic Yearly · 300 WA/mo',
  starter_yr: 'Starter Yearly · 500 WA/mo',
  growth_yr:  'Growth Yearly · 1,000 WA/mo',
  monthly:    'Starter · 500 WA/mo',
  yearly:     'Legacy Yearly',
};

function fmt(n) {
  return n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `₹${n}`;
}

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

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

export default function Settings({ company, onCompanyUpdate, user }) {
  const [notifyHour, setNotifyHour] = useState(9);
  const [notifyDays, setNotifyDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [yearly, setYearly] = useState(false);
  const [payLoading, setPayLoading] = useState(null);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    api.getSettings().then(s => {
      if (s) {
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
    if (notifyDays.length === 0) { setScheduleError('Select at least one day'); return; }
    setSaving(true); setScheduleError(''); setSaved(false);
    try {
      await api.saveSettings({ notify_hour: notifyHour, notify_days: notifyDays.join(',') });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setScheduleError(err.message);
    } finally { setSaving(false); }
  }

  async function handlePay(planKey) {
    setPayLoading(planKey); setPayError('');
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load.');
      const order = await api.createPaymentOrder(planKey);
      if (!order) return;
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Task Delegation Tracker',
        description: order.plan_label,
        order_id: order.order_id,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#4f46e5' },
        handler: async function (response) {
          try {
            const result = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            });
            if (result?.success) {
              localStorage.setItem('tt_company', JSON.stringify(result.company));
              onCompanyUpdate(result.company);
            }
          } catch { setPayError('Payment verification failed. Contact support.'); }
        },
        modal: { ondismiss: () => setPayLoading(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setPayError('Payment failed. Try again.'); setPayLoading(null); });
      rzp.open();
    } catch (err) { setPayError(err.message); setPayLoading(null); }
  }

  const isPaid = company?.subscription_active;
  const planLabel = PLAN_LABELS[company?.plan] || company?.plan || 'Trial';
  const waLimit = company?.wa_limit ?? 100;
  const waSent = company?.wa_messages_sent ?? 0;
  const maxUsers = company?.max_users ?? 3;
  const maxStakeholders = company?.max_stakeholders ?? 10;
  const maxTasks = company?.max_tasks ?? 200;

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 16px' }}>

      {/* Plan & Usage */}
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

          {isPaid && (
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              Unlimited users, stakeholders & tasks.
              {company?.paid_until && (
                <span style={{ marginLeft: 8, color: '#312e81', fontWeight: 600 }}>
                  Renews: {new Date(company.paid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          )}

          {!isPaid && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginTop: 8 }}>
              {/* Header row with toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  Choose a plan
                </p>
                <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
                  <button onClick={() => setYearly(false)} style={{
                    padding: '5px 16px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    background: !yearly ? '#fff' : 'transparent', color: !yearly ? '#312e81' : '#9ca3af',
                    boxShadow: !yearly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
                  }}>Monthly</button>
                  <button onClick={() => setYearly(true)} style={{
                    padding: '5px 16px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    background: yearly ? '#fff' : 'transparent', color: yearly ? '#16a34a' : '#9ca3af',
                    boxShadow: yearly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    Yearly
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: 8 }}>10% OFF</span>
                  </button>
                </div>
              </div>

              {payError && <div className="auth-error" style={{ marginBottom: 14 }}>{payError}</div>}

              {/* 3 plan cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {PLANS.map(p => {
                  const planKey = yearly ? p.yearlyKey : p.key;
                  const isLoadingThis = payLoading === planKey;
                  const disabled = payLoading !== null;
                  return (
                    <div key={p.key} onClick={() => !disabled && handlePay(planKey)} style={{
                      position: 'relative',
                      border: `2px solid ${p.popular ? p.color : '#e5e7eb'}`,
                      borderRadius: 16,
                      padding: '20px 16px 16px',
                      background: p.popular ? p.accent : '#fff',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      boxShadow: p.popular ? `0 6px 24px ${p.color}22` : '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = p.popular ? `0 10px 30px ${p.color}33` : '0 4px 12px rgba(0,0,0,0.1)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = p.popular ? `0 6px 24px ${p.color}22` : '0 1px 4px rgba(0,0,0,0.05)'; }}
                    >
                      {p.popular && (
                        <div style={{
                          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                          background: p.color, color: '#fff', fontSize: 9, fontWeight: 800,
                          padding: '2px 12px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 0.8,
                        }}>POPULAR</div>
                      )}

                      <div style={{ fontSize: 10, fontWeight: 800, color: p.color, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                        {p.label}
                      </div>

                      {yearly ? (
                        <>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                            {fmt(p.yearlyPrice)}
                            <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>/yr</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                            ≈ {fmt(p.effectiveMonthly)}/mo &nbsp;
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>save 10%</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                          {fmt(p.price)}
                          <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>/mo</span>
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: '#4b5563', margin: '10px 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>💬</span>
                        {(yearly ? p.waYearly : p.wa).toLocaleString('en-IN')} WA/{yearly ? 'yr' : 'mo'}
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); if (!disabled) handlePay(planKey); }}
                        disabled={disabled}
                        style={{
                          width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                          background: p.color, color: '#fff', fontWeight: 700, fontSize: 12,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled && !isLoadingThis ? 0.5 : 1,
                        }}
                      >
                        {isLoadingThis ? 'Opening…' : `Pay ${yearly ? fmt(p.yearlyPrice) : fmt(p.price)}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 14, textAlign: 'center' }}>
                All plans include unlimited tasks · users · stakeholders · Secure payments via Razorpay
              </p>
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

            {scheduleError && <div className="form-error">{scheduleError}</div>}

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
