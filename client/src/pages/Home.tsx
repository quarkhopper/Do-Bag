import { Link } from 'react-router-dom';
import styles from './Home.module.css';

export function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to DoBag</h1>
      <p className={styles.subtitle}>
        A flexible task management system that learns from your workflow
      </p>
      <div className={styles.features}>
        <div className={styles.feature}>
          <h3>🎯 Daily Focus</h3>
          <p>Organize your day without rigid structure</p>
        </div>
        <div className={styles.feature}>
          <h3>🤖 Smart Learning</h3>
          <p>The system adapts to your work style</p>
        </div>
        <div className={styles.feature}>
          <h3>⚡ Quick Adaptation</h3>
          <p>Easily handle interruptions and changes</p>
        </div>
      </div>
      <div className={styles.buttons}>
        <Link to="/login" className={styles.button}>
          Log In
        </Link>
        <Link to="/signup" className={styles.buttonOutline}>
          Sign Up
        </Link>
      </div>
    </div>
  );
} 