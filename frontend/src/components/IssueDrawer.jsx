// src/components/IssueDrawer.jsx
import { useState } from 'react';
import { resolveIssue } from '../api/issues';

export default function IssueDrawer({ issue, userId, onClose, onResolved }) {
  const [busy, setBusy] = useState(false);
  if (!issue) return null;

  // only the creator of an OPEN issue can resolve it
  const canResolve = userId && issue.creator_id === userId && issue.status === 'open';

  const handleResolve = async () => {
    try {
      setBusy(true);
      const updated = await resolveIssue(issue.id);   // calls your API helper
      onResolved?.(updated);                          // tell parent to update markers immediately
    } catch (e) {
      alert(e.message || 'Failed to resolve issue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      background: '#fff',
      borderTop: '1px solid #ddd',
      boxShadow: '0 -6px 24px rgba(0,0,0,0.1)',
      padding: 16, zIndex: 1000
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ fontSize: 16 }}>{issue.title}</strong>
        <div>
          {canResolve && (
            <button type="button" onClick={handleResolve} disabled={busy} style={{ marginRight: 8 }}>
              {busy ? 'Resolving.' : 'Mark Resolved'}
            </button>
          )}
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div><b>Type:</b> {issue.type}</div>
        <div><b>Status:</b> {issue.status}</div>
        <div><b>City:</b> {issue.city}</div>
        {issue.description && <div><b>Description:</b> {issue.description}</div>}
        {issue.photo_url && (
          <div>
            <b>Photo:</b><br />
            <img src={issue.photo_url} alt="Issue" style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}
      </div>
    </div>
  );
}

