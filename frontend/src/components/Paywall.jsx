import { useState } from 'react';
import { api } from '../api';

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_LIST = [
  {
    key: 'basic',
    label: 'Basic',
    price: '₹199',
    period: '/mo',
    wa: '300 WA messages/mo',
    color: '#6b7280',
    border: '#d1d5db',
  },
  {
    key: 'starter',
    label: 'Starter',
    price: '₹299',
    period: '/mo',
    wa: '500 WA messages/mo',
    color: '#4f46e5',
    border: '#4f46e5',
    popular: true,
  },
  {
    key: 'growth',
    label: 'Growth',
    price: '₹1,499',
    period: '/mo',
    wa: '2,000 WA messages/mo',
    color: '#0891b2',
    border: '#0891b2',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '₹2,999',
    period: '/mo',
    wa: 'Unlimited WA',
    color: '#7c3aed',
    border: '#7c3aed',
  },
];

export default function Paywall({ company, user, onPaymentSuccess, onLogout }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [showYearly, setShowYearly] = useState(false);

  async function handlePay(plan) {
    setLoading(plan);
    setError('');
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load. Check your internet connection.');

      const order = await api.createPaymentOrder(plan);
      if (!order) return;

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Task Delegation Tracker',
        description: order.plan_label,
        order_id: order.order_id,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#4f46e5' },
        handler: async function (response) {
          try {
            const result = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            });
            if (result?.success) {
              localStorage.setItem('tt_company', JSON.stringify(result.company));
              onPaymentSuccess(result.company);
            }
          } catch (e) {
            setError('Payment verification failed. Contact sumit@highflow.in');
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setError('Payment failed. Please try again.'); setLoading(null); });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  }

  return (
    <div className="auth-page">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28,
          boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
        }}>🔒</div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>
          Your free trial has ended
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {company?.company_name && <><strong>{company.company_name}</strong>'s 30-day trial is over.<br /></>}
          Unlimited tasks & users on all paid plans. WhatsApp reminders included.
        </p>

        {error && <div className="auth-error">{error}</div>}

        {/* Toggle monthly / yearly */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content', margin: '0 auto 24px' }}>
          <button
            onClick={() => setShowYearly(false)}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: !showYearly ? '#fff' : 'transparent', color: !showYearly ? '#312e81' : '#6b7280', boxShadow: !showYearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >Monthly</button>
          <button
            onClick={() => setShowYearly(true)}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: showYearly ? '#fff' : 'transparent', color: showYearly ? '#16a34a' : '#6b7280', boxShadow: showYearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >Yearly <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 800 }}>SAVE 27%</span></button>
        </div>

        {showYearly ? (
          <div style={{ maxWidth: 300, margin: '0 auto 24px' }}>
            <div style={{ border: '2px solid #16a34a', borderRadius: 14, padding: '24px 20px', background: '#f0fdf4' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Yearly — Best Value</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#15803d' }}>₹6,999<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/year</span></div>
              <div style={{ fontSize: 12, color: '#166534', marginTop: 6, marginBottom: 16 }}>6,000 WA messages/year · Unlimited tasks & users</div>
              <button
                onClick={() => handlePay('yearly')}
                disabled={loading !== null}
                className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: loading !== null && loading !== 'yearly' ? 0.5 : 1 }}
              >{loading === 'yearly' ? 'Opening...' : 'Pay ₹6,999/year'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {PLAN_LIST.map(p => (
              <div key={p.key} style={{ position: 'relative', border: `2px solid ${p.border}`, borderRadius: 14, padding: '20px 16px', background: '#fff' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: p.color }}>
                  {p.price}<span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280' }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 6, marginBottom: 14 }}>{p.wa}</div>
                <button
                  onClick={() => handlePay(p.key)}
                  disabled={loading !== null}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    background: p.color, color: '#fff', fontWeight: 700, fontSize: 13,
                    cursor: loading !== null ? 'not-allowed' : 'pointer',
                    opacity: loading !== null && loading !== p.key ? 0.5 : 1,
                  }}
                >{loading === p.key ? 'Opening...' : `Pay ${p.price}`}</button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
          All plans: Unlimited tasks, users & stakeholders · Secure payment via Razorpay
        </p>

        <button className="auth-link" onClick={onLogout} style={{ color: '#9ca3af' }}>Sign out</button>
      </div>
    </div>
  );
}
