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

const PLANS = [
  {
    key: 'basic',     yearlyKey: 'basic_yr',
    label: 'Basic',
    price: 199,       yearlyPrice: 2149,   effectiveMonthly: 179,
    wa: 300,          waYearly: 3600,
    color: '#6b7280', border: '#d1d5db',
  },
  {
    key: 'starter',   yearlyKey: 'starter_yr',
    label: 'Starter',
    price: 299,       yearlyPrice: 3229,   effectiveMonthly: 269,
    wa: 500,          waYearly: 6000,
    color: '#4f46e5', border: '#4f46e5',
    popular: true,
  },
  {
    key: 'growth',    yearlyKey: 'growth_yr',
    label: 'Growth',
    price: 599,       yearlyPrice: 6469,   effectiveMonthly: 539,
    wa: 1000,         waYearly: 12000,
    color: '#0891b2', border: '#0891b2',
  },
];

function fmt(n) {
  return n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `₹${n}`;
}

export default function Paywall({ company, user, onPaymentSuccess, onLogout }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [yearly, setYearly] = useState(false);

  async function handlePay(planKey) {
    setLoading(planKey);
    setError('');
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load.');

      const order = await api.createPaymentOrder(planKey);
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
              plan: planKey,
            });
            if (result?.success) {
              localStorage.setItem('tt_company', JSON.stringify(result.company));
              onPaymentSuccess(result.company);
            }
          } catch {
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
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '36px 20px', textAlign: 'center' }}>

        <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26, boxShadow: '0 6px 20px rgba(79,70,229,0.35)' }}>🔒</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 }}>
          Your free trial has ended
        </h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          {company?.company_name && <><strong>{company.company_name}</strong>'s 30-day trial is over. </>}
          Choose a plan to continue — unlimited tasks, users & stakeholders on all plans.
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Monthly / Yearly toggle */}
        <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 22 }}>
          <button onClick={() => setYearly(false)} style={{ padding: '7px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: !yearly ? '#fff' : 'transparent', color: !yearly ? '#312e81' : '#6b7280', boxShadow: !yearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            Monthly
          </button>
          <button onClick={() => setYearly(true)} style={{ padding: '7px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: yearly ? '#fff' : 'transparent', color: yearly ? '#16a34a' : '#6b7280', boxShadow: yearly ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            Yearly &nbsp;<span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 10 }}>10% OFF</span>
          </button>
        </div>

        {/* Plans grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {PLANS.map(p => {
            const planKey = yearly ? p.yearlyKey : p.key;
            const isLoading = loading === planKey;
            const disabled = loading !== null;
            return (
              <div key={p.key} style={{ position: 'relative', border: `2px solid ${p.border}`, borderRadius: 14, padding: '18px 14px', background: '#fff', textAlign: 'left' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{p.label}</div>

                {yearly ? (
                  <>
                    <div style={{ fontSize: 24, fontWeight: 800, color: p.color }}>
                      {fmt(p.yearlyPrice)}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>/yr</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      ≈ {fmt(p.effectiveMonthly)}/mo &nbsp;
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>10% off</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: p.color }}>
                    {fmt(p.price)}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>/mo</span>
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#555', marginTop: 6, marginBottom: 14 }}>
                  📲 {yearly ? p.waYearly.toLocaleString('en-IN') : p.wa.toLocaleString('en-IN')} WA messages/{yearly ? 'year' : 'month'}
                </div>

                <button
                  onClick={() => handlePay(planKey)}
                  disabled={disabled}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: p.color, color: '#fff', fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !isLoading ? 0.5 : 1 }}
                >
                  {isLoading ? 'Opening...' : `Pay ${yearly ? fmt(p.yearlyPrice) : fmt(p.price)}`}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
          All plans: Unlimited tasks · Unlimited users · Unlimited stakeholders · Secure payments via Razorpay
        </p>

        <button className="auth-link" onClick={onLogout} style={{ color: '#9ca3af' }}>Sign out</button>
      </div>
    </div>
  );
}
