import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import { uploadIssuePhoto, createIssue } from '../api/issues';
import { useNavigate } from 'react-router-dom';

const TORONTO = 'Toronto';

export default function NewIssuePage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState('pothole'); // pothole | garbage | graffiti | light | other
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(TORONTO);   // prefilled but editable
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [file, setFile] = useState(null);

  // UI state
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUserId(data.user?.id || null);
    });
    return () => { alive = false; };
  }, []);

  const useMyLocation = () => {
    setMsg('');
    if (!('geolocation' in navigator)) {
      setMsg('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        // Optional: keep city as manual field (Toronto default); reverse geocode later if you want
      },
      (err) => setMsg(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!userId) { setMsg('You must be logged in.'); return; }
    if (!title.trim()) { setMsg('Title is required.'); return; }
    if (lat == null || lng == null) { setMsg('Click "Use my location" to set coordinates.'); return; }

    try {
      setBusy(true);

      // 1) Upload photo (optional)
      const photo_url = await uploadIssuePhoto(file, userId);

      // 2) Insert row
      const row = await createIssue({
        userId, title: title.trim(), type, description: description.trim(), city: city.trim(),
        lat: Number(lat), lng: Number(lng), photo_url
      });

      // 3) Success  go back to map; Step 7 only requires marker appears after refresh
      setMsg('Issue created!');
      // Navigate to map; MapPage fetches on mount, so you'll see the new marker
      nav('/');
    } catch (err) {
      setMsg(err.message || 'Failed to create issue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '16px auto', padding: 16 }}>
      <h2>Create Issue</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div>Title *</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>

        <label>
          <div>Type</div>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="pothole">Pothole</option>
            <option value="garbage">Garbage</option>
            <option value="graffiti">Graffiti</option>
            <option value="light">Street light</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>
          <div>Description</div>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          <div>City</div>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
          <small>Prefilled to Toronto; you can change it.</small>
        </label>

        <div>
          <div>Location *</div>
          <button type="button" onClick={useMyLocation}>Use my location</button>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            {lat != null && lng != null
              ? <>Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}</>
              : <>Not set</>}
          </div>
        </div>

        <label>
          <div>Photo (optional)</div>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>

        <button type="submit" disabled={busy}>{busy ? 'Saving.' : 'Create issue'}</button>
      </form>

      {msg && <p style={{ marginTop: 8, color: msg.startsWith('Failed') ? 'crimson' : '#333' }}>{msg}</p>}
    </div>
  );
}

