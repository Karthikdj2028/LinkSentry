import { useState } from 'react';
import { useAuth } from '../../context';
import { getAuthErrorMessage } from '../../firebase';

/**
 * LoginPage Component
 * Handles analyst login via Firebase Email/Password Authentication
 */
export default function LoginPage({ onSwitchToRegister }) {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email || email.trim() === '') {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address (e.g. analyst@domain.com).';
    }
    if (!password) {
      return 'Please enter your password.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError('');
    setResetSuccess('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.trim()) {
      setError('Please enter your email address for password reset.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await resetPassword(resetEmail);
      setResetSuccess(`Password reset email sent to ${resetEmail}. Check your inbox.`);
      setShowResetModal(false);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-card-header">
        <h2 className="auth-card-title">Analyst Authentication</h2>
        <p className="auth-card-subtitle">
          Sign in to access the LinkSentry Phishing Detection & Threat Intelligence Console.
        </p>
      </div>

      {error && (
        <div className="auth-error-alert animate-fade-in" role="alert" data-testid="auth-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(34, 197, 94, 0.4)', background: 'rgba(34, 197, 94, 0.1)', color: '#86efac' }} role="alert">
          <span className="error-icon">✓</span>
          <span className="error-text">{resetSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate data-testid="login-form">
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Security Analyst Email
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">✉️</span>
            <input
              id="login-email"
              type="email"
              className="form-input font-mono"
              placeholder="analyst@linksentry.io"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
              autoComplete="email"
              data-testid="login-email-input"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="login-password" className="form-label">
              Access Password
            </label>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => {
                setResetEmail(email);
                setShowResetModal(true);
              }}
            >
              Forgot Password?
            </button>
          </div>
          <div className="input-with-icon-box" style={{ position: 'relative' }}>
            <span className="input-field-icon">🔒</span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input font-mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
              autoComplete="current-password"
              data-testid="login-password-input"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg auth-submit-btn"
          disabled={isSubmitting}
          data-testid="login-submit-button"
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border" />
              <span>Verifying Credentials with Firebase...</span>
            </>
          ) : (
            <>
              <span>⚡ Authenticate & Enter Console</span>
            </>
          )}
        </button>

        <div className="auth-divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <button
          type="button"
          className="btn-google"
          disabled={isSubmitting}
          onClick={async () => {
            setError('');
            setIsSubmitting(true);
            try {
              if (loginWithGoogle) {
                await loginWithGoogle();
              }
            } catch (err) {
              setError(getAuthErrorMessage(err));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign in with Google Workspace</span>
        </button>
      </form>

      {showResetModal && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '8px' }}>
          <h4 style={{ color: '#00f2fe', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Reset Password</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>Enter your email to receive a password reset link from Firebase.</p>
          <input
            type="email"
            className="form-input font-mono"
            placeholder="analyst@linksentry.io"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleResetSubmit} disabled={isSubmitting}>Send Link</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowResetModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="auth-footer-prompt">
        <span>Need a new LinkSentry analyst account?</span>
        <button
          type="button"
          className="auth-switch-btn"
          onClick={onSwitchToRegister}
          disabled={isSubmitting}
          data-testid="switch-to-register-btn"
        >
          Register New Account ➔
        </button>
      </div>
    </div>
  );
}
