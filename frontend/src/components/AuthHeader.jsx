import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';       
import { supabase } from '../api/supabase';

export default function AuthHeader() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    // 1) get current user once
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null);
    });

    // 2) subscribe to auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // user state will clear via onAuthStateChange
  };

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottom: '1px solid #eee'
      }}
    >
      {/* Left: brand + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong>CityWatch</strong>
        <nav style={{ display: 'flex', gap: 8 }}>
          <Link to="/">Map</Link>
          {user && <Link to="/new">New Issue</Link>}
        </nav>
      </div>

      {/* Right: user id + sign out (or not logged in) */}
      <div style={{ fontSize: 12 }}>
        {user ? (
          <>
            User: <code>{user.id}</code>
            <button type="button" onClick={handleSignOut} style={{ marginLeft: 8 }}>
              Sign out
            </button>
          </>
        ) : (
          <>Not logged in</>
        )}
      </div>
    </header>
  );
}

