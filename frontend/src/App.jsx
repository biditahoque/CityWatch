import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './api/supabase';
import AuthHeader from './components/AuthHeader';
import AuthPage from './pages/AuthPage';
import MapPage from './pages/MapPage';
import NewIssuePage from './pages/NewIssuePage';
import IssueDetail from './pages/IssueDetail';
import EmailVerified from './pages/EmailVerified';
import AlertsPage from './pages/AlertsPage';


export default function App() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=logged out

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  if (user === undefined) return <p style={{ padding: 16 }}>Loading.</p>;

  return (
    <>
      <AuthHeader />
      {user ? (
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/new" element={<NewIssuePage />} />
          <Route path="/issue/:id" element={<IssueDetail />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        <AuthPage />
      )}
    </>
  );
}

