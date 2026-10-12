import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Mic, ArrowUp, Square, AlertCircle, X, Globe, Sparkles, Monitor, ChevronDown } from 'lucide-react';
import styles from './InputBar.module.css';

export default function InputBar({ onSend, streaming, onStop }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [fileError, setFileError] = useState('');
  const [selectedModel, setSelectedModel] = useState('Sonnet 4.5');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  // Auto-dismiss file error after 5s
  useEffect(() => {
    if (!fileError) return;
    const t = setTimeout(() => setFileError(''), 5000);
    return () => clearTimeout(t);
  }, [fileError]);

  const toggleTool = useCallback((id) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function handleInput(e) {
    setText(e.target.value);
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
    if (streaming) {
      onStop();
      return;
    }
    if (!text.trim() && attachments.length === 0) return;

    // Map selected tools to backend names
    const toolMap = {
      'web-search': 'websearch',
      'image-gen': 'image_gen',
    };
    const allowedTools = Array.from(selectedTools).map(id => toolMap[id] || id);

    onSend(text.trim(), attachments, allowedTools);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, attachments, streaming, onSend, onStop, selectedTools]);

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    const allowed = [];
    const rejected = [];
    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.csv', '.json', '.xls', '.xlsx'];
    const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

    for (const file of files) {
      const type = file.type || '';
      const name = file.name.toLowerCase();
      const isImg = type.startsWith('image/') || IMAGE_EXTENSIONS.some(ext => name.endsWith(ext));
      const isDoc = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));

      if (isImg || isDoc) {
        allowed.push(file);
      } else {
        rejected.push(file.name);
      }
    }

    if (rejected.length > 0) {
      const list = rejected.length === 1
        ? rejected[0]
        : `${rejected[0]} and ${rejected.length - 1} other${rejected.length > 2 ? 's' : ''}`;
      setFileError(`Unsupported file: ${list}. PDF, image, DOCX, CSV, JSON, and Excel only.`);
    }

    if (allowed.length > 0) {
      setAttachments(prev => [...prev, ...allowed]);
    }
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
      {/* File error banner */}
      {fileError && (
        <div className={styles.fileError} role="alert" aria-live="polite">
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          <span>{fileError}</span>
          <button
            className={styles.fileErrorClose}
            onClick={() => setFileError('')}
            aria-label="Dismiss error"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className={styles.attachRow}>
          {attachments.map((f, i) => (
            <div key={i} className={styles.attachChip}>
              <span>{f.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                aria-label={`Remove ${f.name}`}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Glassmorphic Composer Card */}
      <div className={styles.card}>
        {/* Top Band: Textarea */}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Describe an app or task to build..."
          value={text}
          rows={1}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
        />

        {/* Bottom Band: Toolbar Row */}
        <div className={styles.tools}>
          {/* Left Chips Strip */}
          <div className={styles.chips}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => fileRef.current?.click()}
              title="Attach Screens / Files"
            >
              <Monitor size={14} strokeWidth={2} />
              <span>Attach Screens</span>
            </button>

            <button
              type="button"
              className={`${styles.chip} ${selectedTools.has('web-search') ? styles.chipActive : ''}`}
              onClick={() => toggleTool('web-search')}
              title="Toggle Web Search"
            >
              <Globe size={13} strokeWidth={2} />
              <span>Web Search</span>
            </button>

            <button
              type="button"
              className={`${styles.chip} ${selectedTools.has('image-gen') ? styles.chipActive : ''}`}
              onClick={() => toggleTool('image-gen')}
              title="Toggle Image Generation"
            >
              <Sparkles size={13} strokeWidth={2} />
              <span>Image Gen</span>
            </button>
          </div>

          {/* Right Cluster */}
          <div className={styles.rightCluster}>
            {/* Model Selector */}
            <div className={styles.modelWrap}>
              <button
                type="button"
                className={styles.modelBtn}
                onClick={() => setModelMenuOpen(v => !v)}
                title="Select Model"
              >
                <span>{selectedModel}</span>
                <ChevronDown size={11} strokeWidth={2.2} />
              </button>

              {modelMenuOpen && (
                <div className={styles.modelDropdown}>
                  {['Sonnet 4.5', 'Claude 3.7', 'GPT-4o', 'DeepSeek-R1'].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.modelOption} ${m === selectedModel ? styles.modelOptionActive : ''}`}
                      onClick={() => {
                        setSelectedModel(m);
                        setModelMenuOpen(false);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paperclip button */}
            <button
              type="button"
              className={styles.attachBtn}
              onClick={() => fileRef.current?.click()}
              title="Attach files"
              aria-label="Attach files"
            >
              <Paperclip size={18} strokeWidth={1.8} />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={handleFileChange}
              accept=".pdf,image/*,.docx,.csv,.json,.xls,.xlsx"
            />

            {/* Voice button */}
            <button
              type="button"
              className={`${styles.voiceBtn} ${recording ? styles.recording : ''}`}
              onClick={toggleRecording}
              title={recording ? 'Stop voice recording' : 'Voice input'}
              aria-label={recording ? 'Stop voice recording' : 'Voice input'}
            >
              <Mic size={17} strokeWidth={1.8} />
              {recording && <span className={styles.recordDot} aria-hidden="true" />}
            </button>

            {/* Orange Circular Send Button */}
            <button
              id="btn-send"
              type="button"
              className={`${styles.sendBtn} ${streaming ? styles.stopBtn : ''} ${!canSend && !streaming ? styles.sendDisabled : ''}`}
              onClick={submit}
              aria-label={streaming ? 'Stop generating' : 'Build it'}
              disabled={!canSend && !streaming}
            >
              {streaming ? (
                <Square size={14} strokeWidth={2.5} fill="currentColor" />
              ) : (
                <ArrowUp size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      <p className={styles.hint}>Shift+Enter for new line · Enter to send</p>
    </div>
  );
}
