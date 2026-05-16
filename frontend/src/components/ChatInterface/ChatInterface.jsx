import { useState, useCallback } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import ChatWindow from '../ChatWindow/ChatWindow';
import styles from './ChatInterface.module.css';

const MOCK_CONVERSATIONS = [
  { id: '1', title: 'Build a REST API with FastAPI', date: 'today' },
  { id: '2', title: 'Explain transformer architecture', date: 'today' },
  { id: '3', title: 'Debug React useEffect hook', date: 'yesterday' },
  { id: '4', title: 'Write unit tests for Python code', date: 'yesterday' },
  { id: '5', title: 'Design system tokens setup', date: 'week' },
  { id: '6', title: 'Docker compose configuration', date: 'week' },
  { id: '7', title: 'GraphQL vs REST comparison', date: 'week' },
  { id: '8', title: 'Neural network from scratch', date: 'older' },
  { id: '9', title: 'Kubernetes deployment guide', date: 'older' },
];

export default function ChatInterface({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  const handleSelectConv = useCallback((id) => {
    setActiveConvId(id);
    setMessages([
      { id: 'm1', role: 'user', content: conversations.find(c => c.id === id)?.title || '', ts: Date.now() - 60000 },
      { id: 'm2', role: 'assistant', content: "I'm ready to help with that! Here's what I can do:\n\n- Provide detailed explanations\n- Write and review code\n- Debug issues step by step\n\nWhat would you like to explore first?", ts: Date.now() - 30000 },
    ]);
  }, [conversations]);

  const handleSendMessage = useCallback(async (text, attachments) => {
    if (!text.trim() && attachments.length === 0) return;

    const userMsg = { id: `m${Date.now()}`, role: 'user', content: text, attachments, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    if (!activeConvId) {
      const newId = `conv-${Date.now()}`;
      const title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
      setConversations(prev => [{ id: newId, title, date: 'today' }, ...prev]);
      setActiveConvId(newId);
    }

    setStreaming(true);
    // Simulate streaming response
    const response = "That's a great question! Let me walk you through it.\n\nHere's a code example:\n\n```python\ndef hello_world():\n    print('Hello, World!')\n    return True\n```\n\nThis demonstrates the basic pattern. The function returns `True` on success, which you can use for **error handling** downstream.";
    
    const assistantMsg = { id: `m${Date.now() + 1}`, role: 'assistant', content: '', ts: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, content: response.slice(0, i) } : m
      ));
      if (i >= response.length) {
        clearInterval(interval);
        setStreaming(false);
      }
    }, 20);
  }, [activeConvId]);

  const handleStopStreaming = useCallback(() => {
    setStreaming(false);
  }, []);

  const handleRenameConv = useCallback((id, newTitle) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  }, []);

  const handleDeleteConv = useCallback((id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
  }, [activeConvId]);

  return (
    <div className={styles.layout}>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConv={handleSelectConv}
        onRenameConv={handleRenameConv}
        onDeleteConv={handleDeleteConv}
        onLogout={onLogout}
      />
      <ChatWindow
        messages={messages}
        streaming={streaming}
        activeConvId={activeConvId}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onMenuOpen={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
}
