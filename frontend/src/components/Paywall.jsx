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

export default function Paywall({ company, user, onPaymentSuccess, onLogout }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

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
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
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
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setLoading(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center', padding: '48px 40px' }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28,
          boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
        }}>
          🔒
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>
          Your free trial has ended
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {company?.company_name && <><strong>{company.company_name}</strong>'s 30-day trial is over.<br /></>}
          Choose a plan to continue.
        </p>

        {error && <div className="auth-error">{error}</div>}

        {/* Plans */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {/* Monthly */}
          <div style={{
            flex: 1, border: '2px solid #4f46e5', borderRadius: 12,
            padding: '20px 16px',
            background: loading === 'monthly' ? '#eef2ff' : '#fff',
          }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5' }}>
              ₹799<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/mo</span>
            </div>
            <button
              onClick={() => handlePay('monthly')}
              disabled={loading !== null}
              className="btn btn-primary"
              style={{
                marginTop: 14, width: '100%', justifyContent: 'center', padding: '10px',
                opacity: loading !== null && loading !== 'monthly' ? 0.5 : 1,
              }}
            >
              {loading === 'monthly' ? 'Opening...' : 'Pay ₹799'}
            </button>
          </div>

          {/* Yearly */}
          <div style={{
            flex: 1, border: '2px solid #16a34a', borderRadius: 12,
            padding: '20px 16px', position: 'relative',
            background: loading === 'yearly' ? '#dcfce7' : '#fff',
          }}>
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              background: '#16a34a', color: 'white', fontSize: 10, fontWeight: 700,
              padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap',
            }}>
              SAVE 27%
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yearly</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>
              ₹6,999<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/yr</span>
            </div>
            <button
              onClick={() => handlePay('yearly')}
              disabled={loading !== null}
              className="btn btn-success"
              style={{
                marginTop: 14, width: '100%', justifyContent: 'center', padding: '10px',
                opacity: loading !== null && loading !== 'yearly' ? 0.5 : 1,
              }}
            >
              {loading === 'yearly' ? 'Opening...' : 'Pay ₹6,999'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
          Unlimited tasks & users · All features · Secure payment via Razorpay
        </div>

        <button className="auth-link" onClick={onLogout} style={{ color: '#9ca3af' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
