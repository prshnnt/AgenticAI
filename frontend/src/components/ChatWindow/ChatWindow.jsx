import { useEffect, useRef, useState } from 'react';
import WelcomeScreen from '../WelcomeScreen/WelcomeScreen';
import MessageBubble from '../MessageBubble/MessageBubble';
import InputBar from '../InputBar/InputBar';
import { Menu, ClipboardList } from 'lucide-react';
import styles from './ChatWindow.module.css';

export default function ChatWindow({
  messages, streaming, activeConvId, activeTitle, scratchpadOpen,
  onSendMessage, onStopStreaming, onMenuOpen, sidebarOpen, onToggleScratchpad
}) {
  const bottomRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    if (isAtBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAtBottom]);

  function handleScroll(e) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(atBottom);
  }

  return (
    <main className={styles.window}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {!sidebarOpen && (
            <button className={styles.mobileMenuBtn} onClick={onMenuOpen} aria-label="Open menu">
              <Menu size={18} />
            </button>
          )}
          <h1 className={styles.threadTitle}>{activeConvId ? activeTitle : 'New Chat'}</h1>
        </div>
        <div className={styles.headerRight}>
          {activeConvId && (
            <button
              className={`${styles.scratchpadBtn} ${scratchpadOpen ? styles.scratchpadBtnActive : ''}`}
              onClick={onToggleScratchpad}
              title="Toggle AI Scratchpad"
            >
              <ClipboardList size={14} />
              <span>AI Scratchpad</span>
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <WelcomeScreen onSend={onSendMessage} />
      ) : (
        <div className={styles.messageList} ref={listRef} onScroll={handleScroll}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <InputBar
        onSend={onSendMessage}
        streaming={streaming}
        onStop={onStopStreaming}
        disabled={false}
      />
    </main>
  );
}

