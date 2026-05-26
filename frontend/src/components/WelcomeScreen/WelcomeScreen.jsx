import { Zap, Code2, Globe, Lightbulb, Cpu } from 'lucide-react';
import styles from './WelcomeScreen.module.css';

const SUGGESTIONS = [
  { icon: Code2, title: 'Write a FastAPI endpoint', sub: 'with authentication & validation' },
  { icon: Globe, title: 'Research a topic', sub: 'web-grounded answers with sources' },
  { icon: Lightbulb, title: 'Brainstorm ideas', sub: 'creative and strategic thinking' },
  { icon: Cpu, title: 'Debug my code', sub: 'paste a snippet and I\'ll fix it' },
];

export default function WelcomeScreen({ onSend }) {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logoWrap}>
          <div className={styles.logo}>
            <Zap size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <div className={styles.logoPulse} />
        </div>
        <h1 className={styles.title}>Agentic AI</h1>
        <p className={styles.tagline}>Your intelligent agent workspace — ready to assist.</p>
      </div>

      <div className={styles.cards}>
        {SUGGESTIONS.map(({ icon: Icon, title, sub }) => (
          <button
            key={title}
            className={styles.card}
            onClick={() => onSend(title, [])}
          >
            <div className={styles.cardIcon}><Icon size={18} strokeWidth={1.8} /></div>
            <div>
              <div className={styles.cardTitle}>{title}</div>
              <div className={styles.cardSub}>{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
