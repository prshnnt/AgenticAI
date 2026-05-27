import { Globe, ImageIcon, Code2, Database, X } from 'lucide-react';
import styles from './ToolsPicker.module.css';

const TOOLS = [
  { id: 'web-search', icon: Globe, label: 'Web Search', desc: 'Search the internet' },
  { id: 'image-gen', icon: ImageIcon, label: 'Image Generation', desc: 'Create images with AI' },
];

export default function ToolsPicker({ selectedTools, onToggleTool, onClose }) {


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
            className={`${styles.item} ${selectedTools.has(id) ? styles.itemOn : ''}`}
            onClick={() => onToggleTool(id)}
            role="switch"
            aria-checked={selectedTools.has(id)}
          >
            <div className={`${styles.itemIcon} ${selectedTools.has(id) ? styles.itemIconOn : ''}`}>
              <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className={styles.itemText}>
              <div className={styles.itemLabel}>{label}</div>
              <div className={styles.itemDesc}>{desc}</div>
            </div>
            <div className={`${styles.toggle} ${selectedTools.has(id) ? styles.toggleOn : ''}`}>
              <div className={styles.toggleThumb} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
