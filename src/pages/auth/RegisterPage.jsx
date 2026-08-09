import { useState } from 'react';
import { useAuth } from '../../context';
import { getAuthErrorMessage } from '../../firebase';

/**
 * RegisterPage Component
 * Handles new analyst account registration via Firebase Email/Password Authentication
 */
export default function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email || email.trim() === '') {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address format (e.g. analyst@domain.com).';
    }
    if (!password) {
      return 'Please enter a password.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match. Please ensure both passwords match identically.';
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
      await register(email, password);
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
        <h2 className="auth-card-title">Create Analyst Account</h2>
        <p className="auth-card-subtitle">
          Register to initialize your LinkSentry threat defense workspace and security audit history.
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
          <label htmlFor="register-email" className="form-label">
            Security Analyst Email
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">✉️</span>
            <input
              id="register-email"
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
          <label htmlFor="register-password" className="form-label">
            Password (min 6 characters)
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">🔒</span>
            <input
              id="register-password"
              type="password"
              className="form-input font-mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm Password
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">🛡️</span>
            <input
              id="register-confirm-password"
              type="password"
              className="form-input font-mono"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
              autoComplete="new-password"
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
              <span>Creating Analyst Account with Firebase...</span>
            </>
          ) : (
            <>
              <span>⚡ Complete Registration & Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        <span>Already have an active analyst account?</span>
        <button
          type="button"
          className="auth-switch-btn"
          onClick={onSwitchToLogin}
          disabled={isSubmitting}
        >
          Sign In to Existing Account ➔
        </button>
      </div>
    </div>
  );
}
