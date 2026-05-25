import { useState, useCallback } from 'react';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Zap, Check } from 'lucide-react';
import { Marked } from 'marked';
import styles from './MessageBubble.module.css';

// Create a custom Marked instance to render elements with styles matching the design system
const customMarked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    code(token) {
      const code = token.text || '';
      const lang = token.lang || 'code';
      const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `<div class="md-code-wrap"><div class="md-code-lang">${lang}</div><pre class="md-pre"><code>${esc(code.trim())}</code></pre></div>`;
    },
    codespan(token) {
      return `<code class="md-inline-code">${token.text}</code>`;
    }
  }
});

function parseMarkdown(text) {
  if (!text) return '';
  return customMarked.parse(text);
}

export default function MessageBubble({ message, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked]   = useState(null); // null | 'up' | 'down'

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [message.content]);

  const isUser = message.role === 'user';

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}>
      {!isUser && (
        <div className={styles.avatar} aria-hidden="true">
          <Zap size={13} color="#fff" strokeWidth={2.5} />
        </div>
      )}

      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
        {isUser ? (
          <div className={styles.userText}>{message.content}</div>
        ) : (
          <div
            className={styles.mdContent}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        {isStreaming && <span className={styles.cursor} aria-hidden="true" />}

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className={styles.attachments}>
            {message.attachments.map((f, i) => (
              <div key={i} className={styles.attachment}>{f.name}</div>
            ))}
          </div>
        )}
      </div>

      {/* Assistant action toolbar */}
      {!isUser && !isStreaming && message.content && (
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy'}
            aria-label="Copy message"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button
            className={styles.actionBtn}
            title="Regenerate"
            aria-label="Regenerate response"
          >
            <RotateCcw size={13} />
          </button>
          <div className={styles.divider} />
          <button
            className={`${styles.actionBtn} ${liked === 'up' ? styles.liked : ''}`}
            title="Good response"
            onClick={() => setLiked(v => v === 'up' ? null : 'up')}
          >
            <ThumbsUp size={13} />
          </button>
          <button
            className={`${styles.actionBtn} ${liked === 'down' ? styles.disliked : ''}`}
            title="Bad response"
            onClick={() => setLiked(v => v === 'down' ? null : 'down')}
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
