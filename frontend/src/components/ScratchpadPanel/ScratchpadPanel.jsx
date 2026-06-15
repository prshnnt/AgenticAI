import { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, Trash2, Plus, X, CheckCircle2, Circle, Save, RotateCw } from 'lucide-react';
import styles from './ScratchpadPanel.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ScratchpadPanel({ threadId, onClose, streaming }) {
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState('');
  const [newTodoText, setNewTodoText] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved'); // 'Saved', 'Saving...', 'Error'

  const notesRef = useRef(null);
  const token = localStorage.getItem('access_token');

  // Fetch scratchpad data from API
  const fetchScratchpad = useCallback(async (isPoll = false) => {
    if (!threadId || !token) return;
    if (!isPoll) setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chats/threads/${threadId}/scratchpad`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Update todos
        setTodos(data.todos || []);
        
        // Only update notes if user is not currently editing them (textarea not focused)
        if (document.activeElement !== notesRef.current) {
          setNotes(data.notes || '');
        }
      }
    } catch (err) {
      console.error('Error fetching scratchpad:', err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [threadId, token]);

  // Save full scratchpad data to API
  const saveScratchpad = useCallback(async (updatedTodos, updatedNotes) => {
    if (!threadId || !token) return;
    setSaveStatus('Saving...');
    try {
      const res = await fetch(`${API_BASE}/chats/threads/${threadId}/scratchpad`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          todos: updatedTodos,
          notes: updatedNotes
        })
      });
      if (res.ok) {
        setSaveStatus('Saved');
      } else {
        setSaveStatus('Error');
      }
    } catch (err) {
      console.error('Error saving scratchpad:', err);
      setSaveStatus('Error');
    }
  }, [threadId, token]);

  // Initial fetch and thread change handler
  useEffect(() => {
    fetchScratchpad();
  }, [threadId, fetchScratchpad]);

  // Real-time polling to sync with agent tool actions
  useEffect(() => {
    if (!threadId) return;

    // Poll more frequently if agent is streaming, otherwise slower polling
    const intervalTime = streaming ? 1500 : 4000;
    
    const interval = setInterval(() => {
      fetchScratchpad(true);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [threadId, streaming, fetchScratchpad]);

  // Handle adding a new todo item
  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newTodo = {
      id: Math.random().toString(36).substring(2, 10),
      text: newTodoText.trim(),
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    const nextTodos = [...todos, newTodo];
    setTodos(nextTodos);
    setNewTodoText('');
    saveScratchpad(nextTodos, notes);
  };

  // Toggle todo completion
  const handleToggleTodo = (id) => {
    const nextTodos = todos.map(todo => {
      if (todo.id === id) {
        const completed = !todo.completed;
        return {
          ...todo,
          completed,
          completed_at: completed ? new Date().toISOString() : null
        };
      }
      return todo;
    });
    setTodos(nextTodos);
    saveScratchpad(nextTodos, notes);
  };

  // Delete a todo item
  const handleDeleteTodo = (id) => {
    const nextTodos = todos.filter(todo => todo.id !== id);
    setTodos(nextTodos);
    saveScratchpad(nextTodos, notes);
  };

  // Handle note change and blur save
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleNotesBlur = () => {
    saveScratchpad(todos, notes);
  };

  // Force manual sync
  const handleManualSync = async () => {
    setSyncing(true);
    await fetchScratchpad();
    setTimeout(() => setSyncing(false), 500);
  };

  return (
    <div className={styles.panel} aria-label="AI Scratchpad">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSec}>
          <ClipboardList size={16} className={styles.icon} />
          <span className={styles.title}>AI Scratchpad</span>
        </div>
        <div className={styles.actions}>
          <button 
            className={`${styles.syncBtn} ${syncing ? styles.syncing : ''}`} 
            onClick={handleManualSync} 
            title="Sync with Agent"
          >
            <RotateCw size={13} />
          </button>
          <span className={`${styles.status} ${styles[saveStatus.replace('.', '').toLowerCase()]}`}>
            {saveStatus}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close scratchpad">
            <X size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <span>Syncing workspace...</span>
        </div>
      ) : (
        <div className={styles.content}>
          
          {/* Notes Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Context & Guidance Notes</span>
            </div>
            <textarea
              ref={notesRef}
              className={styles.notesTextarea}
              value={notes}
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
              placeholder="Write guidelines, thoughts, or information here. The AI agent will read and write to this scratchpad to coordinates its tasks..."
            />
          </div>

          {/* Todo list Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Internal Action Checklist</span>
            </div>
            
            {/* Todo Items */}
            <div className={styles.todoList}>
              {todos.length === 0 ? (
                <div className={styles.emptyTodos}>
                  No items in checklist. The agent will add tasks as it works, or you can add them.
                </div>
              ) : (
                todos.map(todo => (
                  <div key={todo.id} className={`${styles.todoItem} ${todo.completed ? styles.completed : ''}`}>
                    <button 
                      className={styles.checkbox} 
                      onClick={() => handleToggleTodo(todo.id)}
                      aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {todo.completed ? (
                        <CheckCircle2 size={16} className={styles.checkedIcon} />
                      ) : (
                        <Circle size={16} className={styles.uncheckedIcon} />
                      )}
                    </button>
                    <span className={styles.todoText}>{todo.text}</span>
                    <button 
                      className={styles.deleteBtn} 
                      onClick={() => handleDeleteTodo(todo.id)}
                      aria-label="Delete todo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Todo Form */}
            <form onSubmit={handleAddTodo} className={styles.addForm}>
              <input
                type="text"
                className={styles.addInput}
                placeholder="Add checklist item..."
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
              />
              <button type="submit" className={styles.addBtn} aria-label="Add item">
                <Plus size={14} />
              </button>
            </form>

          </div>

        </div>
      )}
    </div>
  );
}
