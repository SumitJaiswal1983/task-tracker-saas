import { useState, useEffect } from 'react';
import { api } from '../api';

const PLAN_OPTIONS = [
  { value: 'basic',      label: '₹199/mo · 300 WA' },
  { value: 'starter',   label: '₹299/mo · 500 WA' },
  { value: 'growth',    label: '₹1,000/mo · 1,500 WA' },
  { value: 'pro',       label: '₹2,000/mo · 3,000 WA' },
  { value: 'basic_yr',  label: '₹2,149/yr · 3,600 WA' },
  { value: 'starter_yr',label: '₹3,229/yr · 6,000 WA' },
  { value: 'growth_yr', label: '₹10,800/yr · 18,000 WA' },
  { value: 'pro_yr',    label: '₹21,600/yr · 36,000 WA' },
];

function StatusBadge({ c }) {
  if (c.is_paid) return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534' }}>PAID</span>;
  if (c.is_expired) return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#991b1b' }}>EXPIRED</span>;
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>TRIAL {c.days_remaining}d</span>;
}

function WABar({ sent, limit }) {
  if (!limit || limit === -1) return <span style={{ fontSize: 12, color: '#888' }}>∞ unlimited</span>;
  const pct = Math.min(100, Math.round((sent / limit) * 100));
  const warn = pct >= 80;
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 11, color: warn ? '#dc2626' : '#555', fontWeight: 600, marginBottom: 2 }}>{sent}/{limit}</div>
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: warn ? '#dc2626' : '#25d366' }} />
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getCompanies().then(data => { setCompanies(data || []); setLoading(false); });
  }, []);

  async function updateCompany(company, changes) {
    setSaving(company.id);
    try {
      const updated = await api.updateCompany(company.id, changes);
      if (updated) setCompanies(cs => cs.map(c => c.id === updated.id ? updated : c));
    } catch (e) { alert(e.message); }
    finally { setSaving(null); }
  }

  async function togglePaid(company) {
    const plan = company.is_paid ? 'trial' : (company.plan || 'starter');
    await updateCompany(company, { is_paid: !company.is_paid, plan });
  }

  async function changePlan(company, plan) {
    await updateCompany(company, { is_paid: true, plan });
  }

  const filtered = search
    ? companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : companies;

  const paid = companies.filter(c => c.is_paid).length;
  const trial = companies.filter(c => !c.is_paid && !c.is_expired).length;
  const expired = companies.filter(c => c.is_expired).length;

  if (loading) return <div style={{ padding: 40, color: '#888', textAlign: 'center' }}>Loading…</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>All Companies</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#166534', fontWeight: 700 }}>{paid} paid</span>
            <span style={{ color: '#92400e' }}>{trial} trial</span>
            <span style={{ color: '#991b1b' }}>{expired} expired</span>
            <span style={{ color: '#666' }}>{companies.length} total</span>
          </div>
        </div>
        <input
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 220 }}
          placeholder="Search company or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {['Company', 'Email', 'Users', 'Tasks', 'Plan', 'WA This Month', 'Status', 'Paid Until', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>{c.name}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{c.email}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>{c.user_count}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>{c.task_count}</td>
                <td style={{ padding: '10px 12px' }}>
                  <select
                    value={c.plan || 'trial'}
                    onChange={e => changePlan(c, e.target.value)}
                    disabled={saving === c.id}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', maxWidth: 160 }}
                  >
                    <option value="trial">Trial</option>
                    {PLAN_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <WABar sent={c.wa_messages_sent || 0} limit={c.wa_limit} />
                </td>
                <td style={{ padding: '10px 12px' }}><StatusBadge c={c} /></td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {c.paid_until
                    ? new Date(c.paid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : c.is_expired ? 'Expired' : `${c.days_remaining}d left`}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => togglePaid(c)}
                    disabled={saving === c.id}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                      background: c.is_paid ? '#fef2f2' : '#dcfce7',
                      color: c.is_paid ? '#991b1b' : '#166534',
                    }}
                  >
                    {saving === c.id ? '…' : c.is_paid ? 'Revoke' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>{search ? 'No results' : 'No companies yet'}</p>
        )}
      </div>
    </div>
  );
}
