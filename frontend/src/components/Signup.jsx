import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Signup({ onSignup, onBack }) {
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [googleCred, setGoogleCred] = useState(null);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showCompany, setShowCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 360, text: 'signup_with',
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
    localStorage.setItem('tt_company', JSON.stringify(data.company));
    onSignup(data.user, data.company);
  }

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await api.signup(form);
      if (!data) return;
      saveAndLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (showCompany) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          <div className="auth-logo">
            <div className="auth-logo-icon">T</div>
            <h2 className="auth-title">Almost there!</h2>
            <p className="auth-subtitle">Hi {googleName}! Enter your company name to start.</p>
          </div>
          <form onSubmit={handleCompanySubmit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Company / Organisation Name</label>
              <input className="form-control" autoFocus value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Highflow Industries" required />
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
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">T</div>
          <h2 className="auth-title">Start Free Trial</h2>
          <p className="auth-subtitle">30 days free. No credit card needed.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }} />
            {gLoading && <p style={{ textAlign: 'center', fontSize: 13, color: '#888' }}>Please wait…</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>or fill in manually</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Company / Organisation Name</label>
            <input type="text" className="form-control" value={form.company_name} onChange={set('company_name')} placeholder="Highflow Industries" required autoFocus={!GOOGLE_CLIENT_ID} />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Your Name</label>
            <input type="text" className="form-control" value={form.name} onChange={set('name')} placeholder="Sumit Jaiswal" required />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Work Email</label>
            <input type="email" className="form-control" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
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
