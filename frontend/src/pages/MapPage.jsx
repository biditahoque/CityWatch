import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import IssueDrawer from '../components/IssueDrawer';
import { listIssues } from '../api/issues';
import { supabase } from '../api/supabase';

const TORONTO = [43.65107, -79.347015];

export default function MapPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);
  const [userId, setUserId] = useState(null);

  // Load issues
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listIssues()
      .then((rows) => { if (mounted) setIssues(rows); })
      .catch((e) => { if (mounted) setErr(e.message || 'Failed to load issues'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Get current user id & keep it updated
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const mapStyle = useMemo(() => ({
    height: 'calc(100vh - 52px)',
    width: '100%'
  }), []);

  // Called by the drawer after a successful resolve
  const handleResolved = (updated) => {
    setIssues(prev => prev.map(it => it.id === updated.id ? updated : it));
    setSelected(updated); // keep drawer open, now showing resolved
  };

  return (
    <div>
      {loading && <div style={{ padding: 12 }}>Loading map.</div>}
      {err && <div style={{ padding: 12, color: 'crimson' }}>Error: {err}</div>}

      <MapContainer center={TORONTO} zoom={12} style={mapStyle} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {issues.map((it) => {
          const isResolved = it.status === 'resolved';
          const color = isResolved ? 'green' : 'red';
          return (
            <CircleMarker
              key={it.id}
              center={[it.lat, it.lng]}
              radius={10}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
              eventHandlers={{ click: () => setSelected(it) }}
            />
          );
        })}
      </MapContainer>

      <IssueDrawer
        issue={selected}
        userId={userId}
        onClose={() => setSelected(null)}
        onResolved={handleResolved}
      />
    </div>
  );
}

