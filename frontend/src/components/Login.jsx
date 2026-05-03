import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const GOOGLE_CLIENT_ID = '785722511551-itug55i0bpmip3gktogi4ni7e8evl86s.apps.googleusercontent.com';

export default function Login({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  // When Google says new user — ask company name
  const [googleCred, setGoogleCred] = useState(null);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showCompany, setShowCompany] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 360, text: 'signin_with',
        });
      }
    };
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  async function handleGoogleResponse(response) {
    setGLoading(true); setError('');
    try {
      const data = await api.googleAuth(response.credential);
      if (!data) return;
      if (data.needs_company) {
        setGoogleCred(response.credential);
        setGoogleName(data.name); setGoogleEmail(data.email);
        setShowCompany(true); setGLoading(false); return;
      }
      saveAndLogin(data);
    } catch (err) { setError(err.message); setGLoading(false); }
  }

  async function handleCompanySubmit(e) {
    e.preventDefault();
    if (!companyName.trim()) { setError('Company name required'); return; }
    setGLoading(true); setError('');
    try {
      const data = await api.googleAuth(googleCred, companyName);
      saveAndLogin(data);
    } catch (err) { setError(err.message); setGLoading(false); }
  }

  function saveAndLogin(data) {
    localStorage.setItem('tt_token', data.token);
    localStorage.setItem('tt_user', JSON.stringify(data.user));
    if (data.company) localStorage.setItem('tt_company', JSON.stringify(data.company));
    onLogin(data.user, data.company);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api.login(email, password);
      if (!data) return;
      saveAndLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  // Step 2 — company name for new Google user
  if (showCompany) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">T</div>
            <h2 className="auth-title">One last step</h2>
            <p className="auth-subtitle">Hi {googleName}! What's your company name?</p>
          </div>
          <form onSubmit={handleCompanySubmit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Company / Organisation Name</label>
              <input
                className="form-control" autoFocus
                value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Highflow Industries" required
              />
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Signing up as {googleEmail}</p>
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={gLoading}>
              {gLoading ? 'Creating account…' : 'Start Free Trial'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h2 className="auth-title">Task Delegation Tracker</h2>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Google Sign-in */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }} />
            {gLoading && <p style={{ textAlign: 'center', fontSize: 13, color: '#888' }}>Signing in…</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus={!GOOGLE_CLIENT_ID} />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link" onClick={onSignup}>Start 30-day free trial</button>
        </p>
      </div>
    </div>
  );
}
