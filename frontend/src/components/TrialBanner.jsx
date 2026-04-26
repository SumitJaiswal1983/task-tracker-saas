export default function TrialBanner({ company }) {
  if (!company || company.subscription_active || company.is_expired) return null;

  const days = company.days_remaining;
  const urgent = days <= 5;

  return (
    <div style={{
      background: urgent ? '#b71c1c' : '#e65100',
      color: 'white',
      textAlign: 'center',
      padding: '7px 16px',
      fontSize: 13,
      fontWeight: 500,
    }}>
      {days === 0
        ? 'Your trial expires today.'
        : `Free trial: ${days} day${days === 1 ? '' : 's'} remaining.`}
      {' '}
      <span style={{ opacity: 0.85 }}>Upgrade from ₹799/month to continue.</span>
    </div>
  );
}
