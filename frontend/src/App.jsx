import { useState, useEffect } from 'react';
import NeuralCanvas from './components/NeuralCanvas/NeuralCanvas';
import LoginPage from './components/LoginPage/LoginPage';
import ChatInterface from './components/ChatInterface/ChatInterface';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));

  function handleAuthenticated(newToken) {
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    setToken(null);
  }

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) setToken(stored);
  }, []);

  return (
    <>
      {/* Neural background — only on login */}
      {!token && <NeuralCanvas />}

      {!token && <LoginPage onAuthenticated={handleAuthenticated} />}

      {token && <ChatInterface onLogout={handleLogout} />}
    </>
  );
}
