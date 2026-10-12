import { Code2, Globe, Lightbulb, Cpu } from 'lucide-react';
import styles from './WelcomeScreen.module.css';

const SUGGESTIONS = [
  { icon: Code2, title: 'Build a fintech tracking app', sub: 'with bank-level privacy and realtime analytics' },
  { icon: Globe, title: 'Research a topic', sub: 'web-grounded answers with citations & sources' },
  { icon: Lightbulb, title: 'Brainstorm product features', sub: 'creative architecture and strategy breakdown' },
  { icon: Cpu, title: 'Debug & optimize my code', sub: 'paste a snippet and get instant fixes' },
];

export default function WelcomeScreen({ onSend }) {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logoWrap}>
          <div className={styles.brandMark}>
            <svg width="40" height="40" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="17" fill="#9C86CE" />
              <circle cx="17" cy="17" r="8.6" fill="#FFFFFF" />
              <circle cx="17" cy="17" r="3.7" fill="#151519" />
            </svg>
          </div>
          <div className={styles.logoPulse} />
        </div>
        <h1 className={styles.title}>Describe an app. We'll build it.</h1>
        <p className={styles.tagline}>
          Agentic AI turns natural language descriptions into robust code, deployments, and agents.
        </p>
      </div>

      <div className={styles.cards}>
        {SUGGESTIONS.map(({ icon: Icon, title, sub }) => (
          <button
            key={title}
            type="button"
            className={styles.card}
            onClick={() => onSend(title, [])}
          >
            <div className={styles.cardIcon}>
              <Icon size={18} strokeWidth={1.8} />
            </div>
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
