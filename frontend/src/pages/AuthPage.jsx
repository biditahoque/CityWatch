import { useState } from 'react';
import { supabase } from '../api/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const switchMode = () => { setMsg(''); setMode(mode === 'signin' ? 'signup' : 'signin'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        setMsg('Signed in!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        // Depending on your Supabase email-confirm setting, user may need to confirm via email.
        setMsg('Account created. Check your email if confirmation is required.');
      }
      setEmail(''); setPw('');
    } catch (err) {
      setMsg(err.message || 'Authentication error');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '24px auto', padding: 16 }}>
      <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          type="email" required placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password" required placeholder="Password"
          value={pw} onChange={(e) => setPw(e.target.value)}
        />
        <button type="submit">{mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
      </form>

      <p style={{ marginTop: 10, color: msg.startsWith('Error') ? 'crimson' : '#333' }}>{msg}</p>

      <button onClick={switchMode} style={{ marginTop: 8, background: 'transparent' }}>
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </div>
  );
}

