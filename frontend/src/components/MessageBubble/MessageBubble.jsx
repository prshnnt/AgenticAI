import { useState, useCallback } from 'react';
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Zap, Check } from 'lucide-react';
import styles from './MessageBubble.module.css';

// Lightweight markdown parser
function parseMarkdown(text) {
  // Escape HTML
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Code blocks
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<div class="md-code-wrap"><div class="md-code-lang">${lang || 'code'}</div><pre class="md-pre"><code>${esc(code.trim())}</code></pre></div>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered list
  html = html.replace(/^- (.+)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="md-list">$&</ul>');

  // Paragraphs (double newline → paragraph break)
  html = html.replace(/\n{2,}/g, '</p><p>');
  // Single newlines inside prose
  html = html.replace(/\n/g, '<br/>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
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
