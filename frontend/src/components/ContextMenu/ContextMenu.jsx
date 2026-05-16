import { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Clamp to viewport
  const menuW = 160, menuH = items.length * 36 + 16;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top  = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <div ref={ref} className={styles.menu} style={{ left, top }} role="menu">
      {items.map((item, i) => (
        <button
          key={i}
          className={`${styles.item} ${item.danger ? styles.danger : ''}`}
          onClick={item.onClick}
          role="menuitem"
        >
          <item.icon size={13} strokeWidth={2} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
