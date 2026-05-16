import { useState, useEffect } from 'react';
import NeuralCanvas from './components/NeuralCanvas/NeuralCanvas';
import LoginPage from './components/LoginPage/LoginPage';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));

  // When the user authenticates, store the token
  function handleAuthenticated(newToken) {
    setToken(newToken);
  }

  // Clear auth (useful for future logout button)
  function handleLogout() {
    localStorage.removeItem('access_token');
    setToken(null);
  }

  // Check token validity on mount (simple: just check existence for now)
  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) setToken(stored);
  }, []);

  return (
    <>
      {/* Animated neural network background — always visible */}
      <NeuralCanvas />

      {/* Route: not authenticated → login page */}
      {!token && (
        <LoginPage onAuthenticated={handleAuthenticated} />
      )}

      {/* Route: authenticated → placeholder for chat interface */}
      {token && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #2a5bdb 0%, #4f8eff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(79, 142, 255, 0.4)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 6 }}>
              You&apos;re in, agent.
            </p>
            <p>Chat interface coming soon.</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            Sign out
          </button>
        </div>
      )}
    </>
  );
}
