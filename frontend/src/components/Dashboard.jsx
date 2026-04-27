import { useState, useEffect } from 'react';
import { api } from '../api';

function WhatsAppReminders() {
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    api.getNotificationStatus().then(setStatus).catch(console.error);
  }, []);

  async function sendReminders() {
    setSending(true);
    setResult(null);
    try {
      const r = await api.sendOverdueReminders();
      setResult(r);
      const s = await api.getNotificationStatus();
      setStatus(s);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  }

  async function sendTest(e) {
    e.preventDefault();
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);
    try {
      await api.testWhatsApp(testPhone);
      setTestResult('Test message sent! Check your WhatsApp.');
    } catch (e) {
      setTestResult('Failed: ' + e.message);
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h3>WhatsApp Reminders</h3>
        {status?.configured
          ? <span style={{ fontSize: 11, background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Active</span>
          : <span style={{ fontSize: 11, background: '#fff8e1', color: '#f57f17', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Not Configured</span>
        }
      </div>
      <div style={{ padding: '16px 20px' }}>
        {status === null ? (
          <div style={{ color: '#bbb', fontSize: 13 }}>Checking...</div>
        ) : !status.configured ? (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#795548', lineHeight: 1.6 }}>
            <strong>WhatsApp not configured.</strong><br />
            To enable daily overdue reminders, add these in Render → Environment:<br />
            <code style={{ display: 'block', marginTop: 8, background: '#f5f5f5', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
              WHATSAPP_PHONE_ID = (your Meta phone number ID)<br />
              WHATSAPP_ACCESS_TOKEN = (your Meta access token)
            </code>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#333' }}>
                  <strong>{status.overdueCount}</strong> stakeholder{status.overdueCount !== 1 ? 's' : ''} with overdue tasks and a WhatsApp number.
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Auto-sends daily at 9:00 AM IST.</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={sendReminders}
                disabled={sending || status.overdueCount === 0}
                style={{ whiteSpace: 'nowrap' }}
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
            {result && (
              <div style={{ fontSize: 13, color: result.error ? '#f44336' : '#2e7d32', marginBottom: 10 }}>
                {result.error ? `Error: ${result.error}` : `Sent ${result.sent} reminder${result.sent !== 1 ? 's' : ''} successfully.`}
              </div>
            )}
            <button
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: 0 }}
              onClick={() => setShowTest(t => !t)}
            >
              {showTest ? 'Hide test' : 'Send test message'}
            </button>
            {showTest && (
              <form onSubmit={sendTest} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  className="filter-input"
                  placeholder="919876543210"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  style={{ width: 180 }}
                />
                <button type="submit" className="btn btn-ghost btn-sm" disabled={testSending}>
                  {testSending ? '...' : 'Send Test'}
                </button>
              </form>
            )}
            {testResult && (
              <div style={{ fontSize: 12, color: testResult.startsWith('Failed') ? '#f44336' : '#2e7d32', marginTop: 6 }}>
                {testResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ sheetName, currentUser }) {
  const [stats, setStats] = useState(null);
  const [weeklyScores, setWeeklyScores] = useState([]);
  const [newWeek, setNewWeek] = useState({ week_number: '', score_percent: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboard(sheetName ? { sheet_name: sheetName } : {}),
      api.getWeeklyScores(),
    ]).then(([s, w]) => {
      setStats(s);
      setWeeklyScores(w);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [sheetName]);

  async function addWeekScore(e) {
    e.preventDefault();
    if (!newWeek.week_number || !newWeek.score_percent) return;
    await api.saveWeeklyScore(newWeek);
    const w = await api.getWeeklyScores();
    setWeeklyScores(w);
    setNewWeek({ week_number: '', score_percent: '' });
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!stats) return null;

  const completionPct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3, color: '#111827', letterSpacing: '-0.5px' }}>Dashboard</h2>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>
            {sheetName || 'All sheets'} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </p>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          {completionPct}% Complete
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-sub">{completionPct}% of total</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🔴</div>
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-sub">{stats.overdue > 0 ? 'Needs attention' : 'All on track'}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">⭐</div>
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">{stats.avgScore || '—'}</div>
          <div className="stat-sub">out of 5.0</div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Overall Completion</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="progress-bar" style={{ width: 140 }}>
              <div className="progress-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#4f46e5', minWidth: 40 }}>{completionPct}%</span>
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
            <span>✅ {stats.completed} completed</span>
            <span>⏳ {stats.pending} remaining{stats.overdue > 0 ? ` · 🔴 ${stats.overdue} overdue` : ''}</span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        {/* Stakeholder Performance */}
        <div className="card">
          <div className="card-header"><h3>👥 Stakeholder Performance</h3></div>
          <div className="table-wrap">
            {stats.stakeholderStats.length === 0 ? (
              <div className="empty"><div>No data yet</div></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Total</th>
                    <th>Done</th>
                    <th>Pending</th>
                    <th>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.stakeholderStats.map(s => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>{s.total}</td>
                      <td style={{ color: '#4caf50', fontWeight: 600 }}>{s.completed}</td>
                      <td style={{ color: s.pending > 0 ? '#ff9800' : '#999' }}>{s.pending}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: s.avgScore >= 4 ? '#4caf50' : s.avgScore >= 3 ? '#ff9800' : s.avgScore === '-' ? '#ccc' : '#f44336'
                        }}>
                          {s.avgScore === '-' ? '—' : `${s.avgScore}/5`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="card">
          <div className="card-header"><h3>🏢 Section Breakdown</h3></div>
          <div className="table-wrap">
            {stats.sectionStats.length === 0 ? (
              <div className="empty"><div>No data yet</div></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Total</th>
                    <th>Done</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sectionStats.map(s => {
                    const pct = Math.round((s.completed / s.total) * 100);
                    return (
                      <tr key={s.name}>
                        <td><span className="badge badge-section">{s.name}</span></td>
                        <td>{s.total}</td>
                        <td style={{ fontWeight: 600, color: '#4caf50' }}>{s.completed}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#888', width: 28 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Reminders — admin only */}
      {currentUser?.role === 'admin' && <WhatsAppReminders />}

      {/* Weekly Score */}
      <div className="card">
        <div className="card-header">
          <h3>📈 Weekly Score Tracking</h3>
          <form onSubmit={addWeekScore} style={{ display: 'flex', gap: 8 }}>
            <input
              className="filter-input"
              style={{ width: 120 }}
              placeholder="Week # 25"
              value={newWeek.week_number}
              onChange={e => setNewWeek(w => ({ ...w, week_number: e.target.value }))}
            />
            <input
              className="filter-input"
              style={{ width: 90 }}
              type="number"
              placeholder="Score %"
              value={newWeek.score_percent}
              onChange={e => setNewWeek(w => ({ ...w, score_percent: e.target.value }))}
            />
            <button type="submit" className="btn btn-primary btn-sm">Add</button>
          </form>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {weeklyScores.length === 0 ? (
            <div style={{ color: '#ccc', textAlign: 'center', padding: 20 }}>No weekly scores yet</div>
          ) : (
            weeklyScores.map(w => {
              const pct = Math.max(0, Math.min(100, Math.abs(parseFloat(w.score_percent) || 0)));
              const color = pct >= 80 ? '#4caf50' : pct >= 60 ? '#ff9800' : '#f44336';
              return (
                <div key={w.id} className="week-row">
                  <span className="week-label">{w.week_number}</span>
                  <div className="week-bar-wrap">
                    <div className="week-bar" style={{ width: `${pct}%`, background: color }}>
                      {pct > 15 && `${pct.toFixed(0)}%`}
                    </div>
                  </div>
                  <span className="week-score" style={{ color }}>{parseFloat(w.score_percent).toFixed(1)}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
