import { useState } from 'react';
import { api } from '../api';

export default function Signup({ onSignup, onBack }) {
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.signup(form);
      if (!data) return;
      localStorage.setItem('tt_token', data.token);
      localStorage.setItem('tt_user', JSON.stringify(data.user));
      localStorage.setItem('tt_company', JSON.stringify(data.company));
      onSignup(data.user, data.company);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: '#1a237e', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 22,
          }}>
            T
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
            Start Free Trial
          </h2>
          <p style={{ color: '#888', fontSize: 13 }}>30 days free. No credit card needed.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fce4ec', color: '#c62828', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Company / Organisation Name</label>
            <input
              type="text"
              className="form-control"
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="Highflow Industries"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={set('name')}
              placeholder="Sumit Jaiswal"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Work Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={set('email')}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}
          >
            {loading ? 'Creating account...' : 'Start Free Trial'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#666' }}>
          Already have an account?{' '}
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
