import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SuperAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.getCompanies().then(data => { setCompanies(data || []); setLoading(false); });
  }, []);

  async function togglePaid(company) {
    setSaving(company.id);
    const updated = await api.updateCompany(company.id, {
      is_paid: !company.is_paid,
      plan: !company.is_paid ? 'monthly' : 'trial',
    });
    if (updated) {
      setCompanies(cs => cs.map(c => c.id === updated.id ? updated : c));
    }
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>All Companies</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>{companies.length} companies registered</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['Company', 'Email', 'Users', 'Trial Start', 'Days Left', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '10px 12px', color: '#555' }}>{c.email}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.user_count}</td>
                <td style={{ padding: '10px 12px', color: '#555' }}>
                  {new Date(c.trial_start_date).toLocaleDateString('en-IN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {c.is_paid
                    ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Paid</span>
                    : c.is_expired
                      ? <span style={{ color: '#c62828' }}>Expired</span>
                      : <span>{c.days_remaining}d</span>
                  }
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: c.is_paid ? '#e8f5e9' : c.is_expired ? '#fce4ec' : '#fff3e0',
                    color: c.is_paid ? '#2e7d32' : c.is_expired ? '#c62828' : '#e65100',
                  }}>
                    {c.is_paid ? 'PAID' : c.is_expired ? 'EXPIRED' : 'TRIAL'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => togglePaid(c)}
                    disabled={saving === c.id}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: c.is_paid ? '#fce4ec' : '#e8f5e9',
                      color: c.is_paid ? '#c62828' : '#2e7d32',
                    }}
                  >
                    {saving === c.id ? '...' : c.is_paid ? 'Revoke' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <p style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>No companies yet</p>
        )}
      </div>
    </div>
  );
}
