import { useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

/**
 * AuthPage Component
 * Main authentication portal container allowing seamless switching between Sign In and Registration
 */
export default function AuthPage({ initialMode = 'login' }) {
  const [authMode, setAuthMode] = useState(initialMode); // 'login' | 'register'

  return (
    <div className="auth-page-wrapper animate-fade-in">
      <div className="container auth-container">
        {/* Brand Banner */}
        <div className="auth-brand-header">
          <div className="auth-shield-icon">
            <svg 
              width="36" 
              height="36" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="auth-brand-title">
            LINK<span className="brand-highlight">SENTRY</span>
          </h1>
          <p className="auth-brand-tagline">
            Next-Generation AI Phishing Detection & Threat Intelligence Hub
          </p>
          <div className="auth-badge-status">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
            <span className="font-mono text-cyan">FIREBASE AUTHENTICATION ACTIVE</span>
          </div>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="cyber-card auth-main-card">
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              <span>🔑 Sign In</span>
              {authMode === 'login' && <div className="tab-active-glow" />}
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              <span>🛡️ Register Analyst</span>
              {authMode === 'register' && <div className="tab-active-glow" />}
            </button>
          </div>

          {/* Form Content */}
          <div className="auth-card-body">
            {authMode === 'login' ? (
              <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="auth-security-notice font-mono">
          <span>🔒 256-Bit Encrypted Session • Firebase Client Auth • SOC Defense Protocol</span>
        </div>
      </div>
    </div>
  );
}
