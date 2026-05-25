import { useState } from 'react';
import { Globe, ImageIcon, Code2, Database, X } from 'lucide-react';
import styles from './ToolsPicker.module.css';

const TOOLS = [
  { id: 'web-search', icon: Globe, label: 'Web Search', desc: 'Search the internet' },
  { id: 'image-gen', icon: ImageIcon, label: 'Image Generation', desc: 'Create images with AI' },
  { id: 'code-interp', icon: Code2, label: 'Code Interpreter', desc: 'Run & analyze code' },
  // { id: 'data-store',  icon: Database,  label: 'Data Store',        desc: 'Query your data' },
];

export default function ToolsPicker({ onClose }) {
  const [enabled, setEnabled] = useState(new Set());

  function toggle(id) {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Tools</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close tools"><X size={14} /></button>
      </div>
      <div className={styles.list}>
        {TOOLS.map(({ id, icon: Icon, label, desc }) => (
          <button
            key={id}
            className={`${styles.item} ${enabled.has(id) ? styles.itemOn : ''}`}
            onClick={() => toggle(id)}
            role="switch"
            aria-checked={enabled.has(id)}
          >
            <div className={`${styles.itemIcon} ${enabled.has(id) ? styles.itemIconOn : ''}`}>
              <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className={styles.itemText}>
              <div className={styles.itemLabel}>{label}</div>
              <div className={styles.itemDesc}>{desc}</div>
            </div>
            <div className={`${styles.toggle} ${enabled.has(id) ? styles.toggleOn : ''}`}>
              <div className={styles.toggleThumb} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
