export default function TrialBanner({ company }) {
  if (!company || company.subscription_active || company.is_expired) return null;

  const days = company.days_remaining;
  const urgent = days <= 5;

  return (
    <div style={{
      background: urgent
        ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
        : 'linear-gradient(90deg, #d97706, #b45309)',
      color: 'white',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '0.1px',
    }}>
      {days === 0
        ? 'Your trial expires today.'
        : `Free trial: ${days} day${days === 1 ? '' : 's'} remaining.`}
      {' '}
      <span style={{ opacity: 0.85 }}>Upgrade now to continue.</span>
    </div>
  );
}
