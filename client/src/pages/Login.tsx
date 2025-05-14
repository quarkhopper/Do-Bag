import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from './Auth.module.css';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resendVerification, devVerifyEmail } = useAuth();
  
  // Check if redirected from private route due to unverified email
  useEffect(() => {
    // Use type safety and proper state typing to avoid infinite loops
    const state = location.state as { needsVerification?: boolean } | null;
    if (state?.needsVerification) {
      setNeedsVerification(true);
      
      // Clear the location state to prevent repeated triggers on refresh
      // This is crucial to avoid infinite loops
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Don't reset verification status if it's already true from the route state
    if (!needsVerification) {
      setNeedsVerification(false);
    }
    
    try {
      const response = await login(email, password);
      
      if (!response.emailVerified) {
        setNeedsVerification(true);
      } else {
        navigate('/tasks');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    
    try {
      await resendVerification(email);
      setVerificationSent(true);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    }
  };

  // Development-only function to manually verify an email
  const handleDevVerify = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    
    setDevLoading(true);
    try {
      const success = await devVerifyEmail(email);
      if (success) {
        setError('');
        setNeedsVerification(false);
        alert('Email verified for development! You can now log in.');
      } else {
        setError('Failed to verify email. Make sure the email exists in the system.');
      }
    } catch (err) {
      setError('Error verifying email. Check console for details.');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome Back</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        {needsVerification ? (
          <div className={styles.verificationMessage}>
            <p>You need to verify your email before logging in.</p>
            
            {/* Always show email input if they need to resend verification */}
            <div className={styles.form}>
              <div>
                <label htmlFor="verify-email" className={styles.label}>Email Address</label>
                <input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className={styles.input}
                />
              </div>
            </div>
            
            {verificationSent ? (
              <p><strong>Verification email sent!</strong> Please check your inbox.</p>
            ) : (
              <div className={styles.buttonContainer}>
                <button 
                  onClick={handleResendVerification} 
                  className={styles.button}
                  disabled={!email.trim()}
                >
                  Resend Verification Email
                </button>
                
                {/* Development-only button for bypassing email verification */}
                <button 
                  onClick={handleDevVerify} 
                  className={styles.buttonOutline}
                  disabled={!email.trim() || devLoading}
                  style={{ marginLeft: '10px' }}
                >
                  {devLoading ? 'Verifying...' : 'DEV: Verify Now'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.button}>Log In</button>
          </form>
        )}
        
        <p>
          Don't have an account? <Link to="/signup" className={styles.link}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
} 