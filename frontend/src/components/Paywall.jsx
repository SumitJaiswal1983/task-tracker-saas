export default function Paywall({ company, onLogout }) {
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
        padding: '48px 40px',
        width: '100%',
        maxWidth: 440,
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: 64, height: 64, background: '#fce4ec', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28,
        }}>
          🔒
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
          Your free trial has ended
        </h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
          {company?.company_name && (
            <><strong>{company.company_name}</strong>'s 30-day trial is over.<br /></>
          )}
          Upgrade to continue using the app.
        </p>

        <div style={{
          background: '#f5f5f5', borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1a237e', marginBottom: 4 }}>
            ₹799<span style={{ fontSize: 16, fontWeight: 400, color: '#888' }}>/month</span>
          </div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
            Unlimited tasks & users<br />
            All features included<br />
            WhatsApp notifications
          </div>
        </div>

        <a
          href="mailto:sumit@highflow.in?subject=Upgrade Request&body=Hi, I would like to upgrade my account."
          style={{
            display: 'block',
            background: '#1a237e',
            color: 'white',
            borderRadius: 8,
            padding: '13px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          Contact to Upgrade
        </a>

        <button
          onClick={onLogout}
          style={{
            background: 'none', border: 'none', color: '#999',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
