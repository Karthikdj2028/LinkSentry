import { useState } from 'react';
import { useAuth } from '../../context';
import { getAuthErrorMessage } from '../../firebase';

/**
 * Calculates password strength informatively without enforcing rigid character policies
 */
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', colorClass: '', level: 0 };
  
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  
  const hasMixed = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
  const hasNumbers = /\d/.test(pwd);
  const hasSymbols = /[^a-zA-Z0-9]/.test(pwd);
  
  if (hasMixed) score += 1;
  if (hasNumbers) score += 1;
  if (hasSymbols) score += 1;

  if (pwd.length < 6) {
    return { score: 1, label: 'Too short (min 6)', colorClass: 'weak', level: 1 };
  } else if (score <= 2) {
    return { score: 1, label: 'Weak', colorClass: 'weak', level: 1 };
  } else if (score <= 4) {
    return { score: 2, label: 'Fair', colorClass: 'fair', level: 2 };
  } else {
    return { score: 3, label: 'Strong', colorClass: 'strong', level: 3 };
  }
}

/**
 * RegisterPage Component
 * Handles new analyst account registration via Firebase Email/Password Authentication
 */
export default function RegisterPage({ onSwitchToLogin }) {
  const { register, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  // Field level validation calculations
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const getEmailError = () => {
    if (!touched.email) return '';
    if (!email.trim()) return 'Please enter your email address.';
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address format (e.g. analyst@domain.com).';
    return '';
  };

  const getPasswordError = () => {
    if (!touched.password) return '';
    if (!password) return 'Please enter a password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const getConfirmPasswordError = () => {
    if (!touched.confirmPassword && !confirmPassword) return '';
    if (!confirmPassword) return 'Please confirm your password.';
    if (password && confirmPassword !== password) return 'Passwords do not match.';
    return '';
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();
  const confirmPasswordError = getConfirmPasswordError();
  const isConfirmMatch = password && confirmPassword && password === confirmPassword && password.length >= 6;

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });

    if (!email || !email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address format (e.g. analyst@domain.com).');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await register(email, password);
      // Firebase auth state listener in AuthContext will transition user directly to Overview
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
        <div className="auth-error-alert animate-fade-in" role="alert" data-testid="auth-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate data-testid="register-form">
        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Security Analyst Email
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">✉️</span>
            <input
              id="register-email"
              type="email"
              className={`form-input font-mono ${emailError ? 'input-error' : ''}`}
              placeholder="analyst@linksentry.io"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => handleBlur('email')}
              disabled={isSubmitting}
              autoComplete="email"
              data-testid="register-email-input"
              required
            />
          </div>
          {emailError && (
            <div className="field-error-text animate-fade-in">
              <span>⚠️ {emailError}</span>
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            Password (min 6 characters)
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">🔒</span>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className={`form-input font-mono ${passwordError ? 'input-error' : ''}`}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => handleBlur('password')}
              disabled={isSubmitting}
              autoComplete="new-password"
              data-testid="register-password-input"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>

          {/* Real-time Password Strength Indicator */}
          {password && (
            <div className="password-strength-container animate-fade-in" data-testid="password-strength-meter">
              <div className="password-strength-header">
                <span className="password-strength-label">Password Strength:</span>
                <span className={`password-strength-value ${strength.colorClass}`}>
                  {strength.label}
                </span>
              </div>
              <div className="password-strength-bars">
                <div className={`strength-bar-segment ${strength.level >= 1 ? `active-${strength.colorClass}` : ''}`} />
                <div className={`strength-bar-segment ${strength.level >= 2 ? `active-${strength.colorClass}` : ''}`} />
                <div className={`strength-bar-segment ${strength.level >= 3 ? `active-${strength.colorClass}` : ''}`} />
              </div>
            </div>
          )}

          {passwordError && (
            <div className="field-error-text animate-fade-in">
              <span>⚠️ {passwordError}</span>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="form-group">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm Password
          </label>
          <div className="input-with-icon-box">
            <span className="input-field-icon">🛡️</span>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className={`form-input font-mono ${confirmPasswordError ? 'input-error' : isConfirmMatch ? 'input-success' : ''}`}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => handleBlur('confirmPassword')}
              disabled={isSubmitting}
              autoComplete="new-password"
              data-testid="register-confirm-password-input"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? '👁️' : '🙈'}
            </button>
          </div>
          {confirmPasswordError && (
            <div className="field-error-text animate-fade-in" data-testid="confirm-password-error">
              <span>⚠️ {confirmPasswordError}</span>
            </div>
          )}
          {isConfirmMatch && (
            <div className="field-success-text animate-fade-in">
              <span>✓ Passwords match</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg auth-submit-btn"
          disabled={isSubmitting}
          data-testid="register-submit-button"
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
          data-testid="register-google-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign up with Google Workspace</span>
        </button>
      </form>

      <div className="auth-footer-prompt">
        <span>Already have an active analyst account?</span>
        <button
          type="button"
          className="auth-switch-btn"
          onClick={onSwitchToLogin}
          disabled={isSubmitting}
          data-testid="switch-to-login-btn"
        >
          Sign In to Existing Account ➔
        </button>
      </div>
    </div>
  );
}
