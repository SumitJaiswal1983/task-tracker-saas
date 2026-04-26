import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Paywall from './components/Paywall';
import TrialBanner from './components/TrialBanner';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import Users from './components/Users';
import PeopleAndSections from './components/PeopleAndSections';
import SuperAdmin from './components/SuperAdmin';

const SHEETS = [
  { id: 'Sheet 1', label: 'Sheet 1' },
  { id: 'Sheet 2', label: 'Sheet 2' },
];

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem('tt_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('login'); // 'login' | 'signup'
  const [tab, setTab] = useState('dashboard');
  const [sheet, setSheet] = useState('Sheet 1');

  useEffect(() => {
    if (user) localStorage.setItem('tt_user', JSON.stringify(user));
  }, [user]);

  // Listen for trial-expired events from api.js
  useEffect(() => {
    function onExpired() {
      setCompany(c => c ? { ...c, is_expired: true } : c);
    }
    window.addEventListener('trial-expired', onExpired);
    return () => window.removeEventListener('trial-expired', onExpired);
  }, []);

  function handleLogin(u, comp) {
    setUser(u);
    setCompany(comp);
    setPage('login');
  }

  function handleLogout() {
    localStorage.clear();
    setUser(null);
    setCompany(null);
    setPage('login');
  }

  // Not logged in
  if (!user) {
    if (page === 'signup') {
      return <Signup onSignup={handleLogin} onBack={() => setPage('login')} />;
    }
    return <Login onLogin={handleLogin} onSignup={() => setPage('signup')} />;
  }

  // Trial expired (non-superadmin)
  if (user.role !== 'superadmin' && company?.is_expired) {
    return (
      <Paywall
        company={company}
        user={user}
        onPaymentSuccess={(updatedCompany) => setCompany(updatedCompany)}
        onLogout={handleLogout}
      />
    );
  }

  const isSuperAdmin = user.role === 'superadmin';

  return (
    <>
      <TrialBanner company={company} />

      <header className="header">
        <div className="header-brand">
          <div style={{
            width: 32, height: 32, background: 'rgba(255,255,255,0.15)',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white',
          }}>
            T
          </div>
          <div className="header-brand-divider" />
          <h1>Task Delegation Tracker</h1>
        </div>

        <nav className="nav-tabs">
          {!isSuperAdmin && (
            <>
              <button className={`nav-tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>
                Dashboard
              </button>
              <button className={`nav-tab${tab === 'tasks' ? ' active' : ''}`} onClick={() => setTab('tasks')}>
                Tasks
              </button>
              {user.role === 'admin' && (
                <button className={`nav-tab${tab === 'people' ? ' active' : ''}`} onClick={() => setTab('people')}>
                  People & Sections
                </button>
              )}
              {user.role === 'admin' && (
                <button className={`nav-tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
                  Users
                </button>
              )}
            </>
          )}
          {isSuperAdmin && (
            <button className={`nav-tab${tab === 'admin' ? ' active' : ''}`} onClick={() => setTab('admin')}>
              Companies
            </button>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isSuperAdmin && tab !== 'users' && tab !== 'people' && (
            <div className="sheet-switcher">
              {SHEETS.map(s => (
                <button
                  key={s.id}
                  className={`sheet-btn${sheet === s.id ? ' active' : ''}`}
                  onClick={() => setSheet(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
              {user.name}
              {isSuperAdmin && (
                <span style={{ marginLeft: 5, fontSize: 10, background: '#7b1fa2', color: 'white', padding: '1px 5px', borderRadius: 8 }}>Super Admin</span>
              )}
              {user.role === 'admin' && !isSuperAdmin && (
                <span style={{ marginLeft: 5, fontSize: 10, background: '#4caf50', color: 'white', padding: '1px 5px', borderRadius: 8 }}>Admin</span>
              )}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.2)', fontSize: 12 }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {isSuperAdmin && <SuperAdmin />}
        {!isSuperAdmin && tab === 'dashboard' && <Dashboard sheetName={sheet} currentUser={user} />}
        {!isSuperAdmin && tab === 'tasks' && <TaskList sheetName={sheet} currentUser={user} />}
        {!isSuperAdmin && tab === 'people' && user.role === 'admin' && <PeopleAndSections />}
        {!isSuperAdmin && tab === 'users' && user.role === 'admin' && <Users currentUser={user} />}
      </main>
    </>
  );
}
