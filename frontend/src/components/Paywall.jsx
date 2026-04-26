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
        theme: { color: '#1a237e' },
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
        maxWidth: 480,
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
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {company?.company_name && <><strong>{company.company_name}</strong>'s 30-day trial is over.<br /></>}
          Choose a plan to continue.
        </p>

        {error && (
          <div style={{
            background: '#fce4ec', color: '#c62828', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Plans */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {/* Monthly */}
          <div style={{
            flex: 1, border: '2px solid #1a237e', borderRadius: 12,
            padding: '20px 16px', cursor: 'pointer',
            background: loading === 'monthly' ? '#e8eaf6' : '#fff',
          }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Monthly</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1a237e' }}>
              ₹799<span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/mo</span>
            </div>
            <button
              onClick={() => handlePay('monthly')}
              disabled={loading !== null}
              style={{
                marginTop: 14, width: '100%', background: '#1a237e', color: 'white',
                border: 'none', borderRadius: 8, padding: '10px', fontSize: 13,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading !== null && loading !== 'monthly' ? 0.5 : 1,
              }}
            >
              {loading === 'monthly' ? 'Opening...' : 'Pay ₹799'}
            </button>
          </div>

          {/* Yearly */}
          <div style={{
            flex: 1, border: '2px solid #2e7d32', borderRadius: 12,
            padding: '20px 16px', cursor: 'pointer', position: 'relative',
            background: loading === 'yearly' ? '#e8f5e9' : '#fff',
          }}>
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              background: '#2e7d32', color: 'white', fontSize: 10, fontWeight: 700,
              padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap',
            }}>
              SAVE 27%
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Yearly</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2e7d32' }}>
              ₹6,999<span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/yr</span>
            </div>
            <button
              onClick={() => handlePay('yearly')}
              disabled={loading !== null}
              style={{
                marginTop: 14, width: '100%', background: '#2e7d32', color: 'white',
                border: 'none', borderRadius: 8, padding: '10px', fontSize: 13,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading !== null && loading !== 'yearly' ? 0.5 : 1,
              }}
            >
              {loading === 'yearly' ? 'Opening...' : 'Pay ₹6,999'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
          Unlimited tasks & users · All features · Secure payment via Razorpay
        </div>

        <button
          onClick={onLogout}
          style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
