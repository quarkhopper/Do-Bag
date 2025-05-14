import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

export function EmailVerified() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email Verified!</h1>
        <div className={styles.successIcon}>✓</div>
        <p className={styles.message}>
          Your email has been successfully verified. You can now use all features of DoBag.
        </p>
        <div className={styles.buttonContainer}>
          <Link to="/login" className={styles.button}>
            Log In
          </Link>
          <Link to="/tasks" className={styles.buttonOutline}>
            Go to Tasks
          </Link>
        </div>
      </div>
    </div>
  );
} 