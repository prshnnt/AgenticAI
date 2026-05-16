import { useState } from 'react';
import { User, Lock, Mail, Eye, EyeOff, Zap, AlertCircle } from 'lucide-react';
import styles from './LoginPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ─── Helpers ─── */
async function apiLogin(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data; // { access_token, token_type }
}

async function apiRegister(username, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data; // UserResponse
}

/* ─── Component ─── */
export default function LoginPage({ onAuthenticated }) {
  const [mode, setMode]               = useState('login');   // 'login' | 'register'
  const [showPassword, setShowPw]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // form fields
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  function switchMode(next) {
    setMode(next);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password.trim()) { setError('Password is required.'); return; }
    if (mode === 'register' && !email.trim()) { setError('Email is required.'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { access_token } = await apiLogin(username, password);
        localStorage.setItem('access_token', access_token);
        onAuthenticated?.(access_token);
      } else {
        await apiRegister(username, email, password);
        // Auto-switch to login after successful registration
        switchMode('login');
        setError(''); // clear just in case
        // Pre-fill username
        setUsername(username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.card} role="main">

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className={styles.brandName}>AgentOS</div>
            <div className={styles.brandTag}>AI Platform</div>
          </div>
        </div>

        {/* Heading */}
        <h1 className={styles.heading}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className={styles.subheading}>
          {mode === 'login'
            ? 'Sign in to access your agent workspace'
            : 'Deploy your first agent in seconds'}
        </p>

        {/* Mode tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Authentication mode">
          <button
            id="tab-login"
            role="tab"
            aria-selected={mode === 'login'}
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            id="tab-register"
            role="tab"
            aria-selected={mode === 'register'}
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className={styles.errorBanner} role="alert" aria-live="assertive">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* Username */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-username" className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <User size={15} strokeWidth={2} />
              </span>
              <input
                id="login-username"
                type="text"
                className={styles.input}
                placeholder="your_username"
                autoComplete={mode === 'login' ? 'username' : 'username'}
                autoFocus
                required
                disabled={loading}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Email — register only */}
          {mode === 'register' && (
            <div className={styles.fieldGroup}>
              <label htmlFor="register-email" className={styles.label}>Email</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Mail size={15} strokeWidth={2} />
                </span>
                <input
                  id="register-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <Lock size={15} strokeWidth={2} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${styles.inputPassword}`}
                placeholder="••••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                disabled={loading}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPw(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword
                  ? <EyeOff size={15} strokeWidth={2} />
                  : <Eye     size={15} strokeWidth={2} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id={mode === 'login' ? 'btn-login' : 'btn-register'}
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            {loading
              ? (mode === 'login' ? 'Authenticating…' : 'Creating account…')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Link row */}
        <div className={styles.linkRow}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => switchMode('register')}>Register</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')}>Sign in</button>
            </>
          )}
        </div>

        {/* Status footer */}
        <div className={styles.footer}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusText}>ALL SYSTEMS OPERATIONAL</span>
        </div>

      </main>
    </div>
  );
}
