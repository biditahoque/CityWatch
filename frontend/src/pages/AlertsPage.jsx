import EmailAlerts from '../components/EmailAlerts';

export default function AlertsPage() {
  return (
    <div style={{ maxWidth: 520, margin: '16px auto', padding: 16 }}>
      <h2>Email Alerts</h2>
      <EmailAlerts />
    </div>
  );
}

