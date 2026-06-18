import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import ChatWindow from '../ChatWindow/ChatWindow';
import styles from './ChatInterface.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChatInterface({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const activeReaderRef = useRef(null);
  const token = localStorage.getItem('access_token');

  // Fetch threads on mount
  useEffect(() => {
    if (!token) {
      onLogout();
      return;
    }

    const fetchThreads = async () => {
      try {
        const res = await fetch(`${API_BASE}/chats/threads`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch threads');
        const data = await res.json();
        setConversations(data);
      } catch (err) {
        console.error('Error fetching threads:', err);
      }
    };

    fetchThreads();
  }, [token, onLogout]);

  // Clean up any streaming reader on unmount
  useEffect(() => {
    return () => {
      if (activeReaderRef.current) {
        try {
          activeReaderRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  const handleSelectConv = useCallback(async (id) => {
    setActiveConvId(id);
    setMessages([]);

    if (!id) return;

    try {
      const res = await fetch(`${API_BASE}/chats/threads/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch chat history');
      const data = await res.json();
      
      const normalized = (data.messages || []).map(msg => ({
        id: msg.id,
        role: msg.role === 'human' ? 'user' : 'assistant',
        content: msg.content,
        ts: new Date(msg.created_at).getTime()
      }));
      
      setMessages(normalized);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  }, [token, onLogout]);

  const handleSendMessage = useCallback(async (text, attachments, allowedTools) => {
    if (!text.trim() && attachments.length === 0) return;

    // Add user message to state
    const userMsgId = `user-${Date.now()}`;
    const userMsg = { id: userMsgId, role: 'user', content: text, attachments, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    let currentConvId = activeConvId;

    try {
      // Upload attachments to backend (simulation)
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadRes = await fetch(`${API_BASE}/chats/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (uploadRes.status === 401) {
            onLogout();
            return;
          }
          if (!uploadRes.ok) {
            throw new Error(`Failed to upload file: ${file.name}`);
          }
          const uploadData = await uploadRes.json();
          console.log('Successfully simulated upload on backend:', uploadData);
        }
      }

      // 1. Create a thread if none is active
      if (!currentConvId) {
        const title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
        const res = await fetch(`${API_BASE}/chats/threads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title })
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) throw new Error('Failed to create chat thread');
        const newThread = await res.json();
        
        currentConvId = newThread.id;
        setActiveConvId(currentConvId);
        setConversations(prev => [newThread, ...prev]);
      }

      setStreaming(true);

      // Add dummy assistant message shell
      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMsg = { id: assistantMsgId, role: 'assistant', content: '', steps: [], ts: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);

      // 2. Call send message endpoint & start streaming
      const response = await fetch(`${API_BASE}/chats/threads/${currentConvId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: text, allowed_tools: allowedTools })
      });

      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      activeReaderRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const eventData = JSON.parse(jsonStr);
            if (eventData.type === 'content' && eventData.content) {
              accumulatedContent += eventData.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
              ));
            } else if (eventData.type === 'tool_name' && eventData.tool_name) {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, steps: [...(m.steps || []), { toolName: eventData.tool_name, status: 'running', output: '' }] }
                  : m
              ));
            } else if (eventData.type === 'tool_output') {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsgId) return m;
                const steps = [...(m.steps || [])];
                if (steps.length > 0) {
                  steps[steps.length - 1] = {
                    ...steps[steps.length - 1],
                    status: 'completed',
                    output: eventData.content || ''
                  };
                }
                return { ...m, steps };
              }));
            } else if (eventData.type === 'error') {
              accumulatedContent += `\n[Error: ${eventData.content}]`;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
              ));
            }
          } catch (e) {
            console.error('Error parsing SSE event data:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Append error message to UI
      const errMsgId = `error-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: errMsgId,
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong. Please check connection and try again.'}`,
        ts: Date.now()
      }]);
    } finally {
      setStreaming(false);
      activeReaderRef.current = null;
      
      // Update thread order/time in conversations list
      if (currentConvId) {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === currentConvId);
          if (idx !== -1) {
            const updated = { ...prev[idx], updated_at: new Date().toISOString() };
            const rest = prev.filter(c => c.id !== currentConvId);
            return [updated, ...rest];
          }
          return prev;
        });
      }
    }
  }, [activeConvId, token, onLogout]);

  const handleStopStreaming = useCallback(() => {
    if (activeReaderRef.current) {
      try {
        activeReaderRef.current.cancel();
      } catch (e) {
        console.error('Failed to cancel stream reader', e);
      }
      activeReaderRef.current = null;
    }
    setStreaming(false);
  }, []);

  const handleRenameConv = useCallback(async (id, newTitle) => {
    try {
      const res = await fetch(`${API_BASE}/chats/threads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to rename thread');
      
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    } catch (err) {
      console.error('Error renaming thread:', err);
    }
  }, [token, onLogout]);

  const handleDeleteConv = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/chats/threads/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to delete thread');

      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error deleting thread:', err);
    }
  }, [activeConvId, token, onLogout]);

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
