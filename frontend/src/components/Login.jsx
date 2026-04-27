import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      if (!data) return;
      localStorage.setItem('tt_token', data.token);
      localStorage.setItem('tt_user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('tt_company', JSON.stringify(data.company));
      onLogin(data.user, data.company);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h2 className="auth-title">Task Delegation Tracker</h2>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link" onClick={onSignup}>
            Start 30-day free trial
          </button>
        </p>
      </div>
    </div>
  );
}
