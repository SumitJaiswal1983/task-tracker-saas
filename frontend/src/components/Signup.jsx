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
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h2 className="auth-title">Start Free Trial</h2>
          <p className="auth-subtitle">30 days free. No credit card needed.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

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
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Start Free Trial'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link" onClick={onBack}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
