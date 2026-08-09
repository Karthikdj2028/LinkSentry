import { useState } from 'react';
import { useAuth } from '../../context';
import { getAuthErrorMessage } from '../../firebase';

/**
 * LoginPage Component
 * Handles analyst login via Firebase Email/Password Authentication
 */
export default function LoginPage({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Auth state listener in AuthContext will automatically transition user to protected app
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
        <div className="auth-error-alert animate-fade-in" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Access Password
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">🔒</span>
            <input
              id="login-password"
              type="password"
              className="form-input font-mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg auth-submit-btn"
          disabled={isSubmitting}
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
      </form>

      <div className="auth-footer-prompt">
        <span>Need a new LinkSentry analyst account?</span>
        <button
          type="button"
          className="auth-switch-btn"
          onClick={onSwitchToRegister}
          disabled={isSubmitting}
        >
          Register New Account ➔
        </button>
      </div>
    </div>
  );
}
