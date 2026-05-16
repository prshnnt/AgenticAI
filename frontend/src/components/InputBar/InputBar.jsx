import { useState, useRef, useCallback } from 'react';
import { Paperclip, Mic, Wrench, ArrowUp, Square } from 'lucide-react';
import ToolsPicker from '../ToolsPicker/ToolsPicker';
import styles from './InputBar.module.css';

export default function InputBar({ onSend, streaming, onStop }) {
  const [text, setText]               = useState('');
  const [toolsOpen, setToolsOpen]     = useState(false);
  const [recording, setRecording]     = useState(false);
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  function handleInput(e) {
    setText(e.target.value);
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const submit = useCallback(() => {
    if (streaming) { onStop(); return; }
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, attachments, streaming, onSend, onStop]);

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  }

  function removeAttachment(i) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
  }

  function toggleRecording() {
    setRecording(v => !v);
  }

  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className={styles.wrapper}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className={styles.attachRow}>
          {attachments.map((f, i) => (
            <div key={i} className={styles.attachChip}>
              <span>{f.name}</span>
              <button onClick={() => removeAttachment(i)} aria-label="Remove attachment">×</button>
            </div>
          ))}
        </div>
      )}

      <div className={`${styles.bar} ${toolsOpen ? styles.barFocused : ''}`}>
        {/* Left icons */}
        <div className={styles.leftIcons}>
          {/* Attach */}
          <button
            className={styles.iconBtn}
            onClick={() => fileRef.current?.click()}
            title="Attach file"
            aria-label="Attach file"
            type="button"
          >
            <Paperclip size={16} strokeWidth={1.8} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={handleFileChange} />

          {/* Voice */}
          <button
            className={`${styles.iconBtn} ${recording ? styles.recording : ''}`}
            onClick={toggleRecording}
            title={recording ? 'Stop recording' : 'Voice input'}
            aria-label={recording ? 'Stop recording' : 'Start voice input'}
            type="button"
          >
            <Mic size={16} strokeWidth={1.8} />
            {recording && <span className={styles.recordDot} aria-hidden="true" />}
          </button>

          {/* Tools */}
          <div className={styles.toolsWrap}>
            <button
              className={`${styles.iconBtn} ${toolsOpen ? styles.iconBtnActive : ''}`}
              onClick={() => setToolsOpen(v => !v)}
              title="Tools"
              aria-label="Toggle tools"
              type="button"
            >
              <Wrench size={16} strokeWidth={1.8} />
            </button>
            {toolsOpen && <ToolsPicker onClose={() => setToolsOpen(false)} />}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Message AgentOS…"
          value={text}
          rows={1}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          disabled={false}
        />

        {/* Send / Stop button */}
        <button
          id="btn-send"
          className={`${styles.sendBtn} ${streaming ? styles.stopBtn : ''} ${!canSend && !streaming ? styles.sendDisabled : ''}`}
          onClick={submit}
          aria-label={streaming ? 'Stop generating' : 'Send message'}
          type="button"
          disabled={!canSend && !streaming}
        >
          {streaming ? <Square size={14} strokeWidth={2.5} /> : <ArrowUp size={16} strokeWidth={2.5} />}
        </button>
      </div>

      <p className={styles.hint}>Shift+Enter for new line · Enter to send</p>
    </div>
  );
}
