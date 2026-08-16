import { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../context';
import FeedbackModal from '../components/FeedbackModal';

/**
 * ProfilePage Component
 * Provides account management, 3-state Appearance selector, Security preferences,
 * expandable Help & Support FAQ, Feedback modal trigger, and developer diagnostics.
 */
export default function ProfilePage() {
  const { currentUser, logout, resetPassword, deleteUserAccount } = useAuth();
  const { theme, setTheme, securityPreferences, updateSecurityPreference } = useTheme();

  const [copiedKey, setCopiedKey] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Expanded FAQ topics
  const [expandedTopic, setExpandedTopic] = useState(null);

  // Developer Diagnostics State
  const [showDevDiagnostics, setShowDevDiagnostics] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', text: 'Checking endpoint...' });
  const [isProbing, setIsProbing] = useState(false);

  const probeBackendHealth = async (targetUrl = apiBaseUrl) => {
    try {
      setIsProbing(true);
      const cleanUrl = targetUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendHealth({
          status: 'online',
          text: `Online (${data.service || 'LinkSentry API'} v${data.version || '3.3.0'})`
        });
      } else {
        setBackendHealth({ status: 'offline', text: `HTTP ${res.status}` });
      }
    } catch (err) {
      setBackendHealth({ status: 'unreachable', text: `Unreachable (${err.message})` });
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const probe = async () => {
      try {
        const cleanUrl = apiBaseUrl.replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/health`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setBackendHealth({
            status: 'online',
            text: `Online (${data.service || 'LinkSentry API'} v${data.version || '3.3.0'})`
          });
        } else if (isMounted) {
          setBackendHealth({ status: 'offline', text: `HTTP ${res.status}` });
        }
      } catch (err) {
        if (isMounted) {
          setBackendHealth({ status: 'unreachable', text: `Unreachable (${err.message})` });
        }
      }
    };
    probe();
    return () => { isMounted = false; };
  }, [apiBaseUrl]);

  const handleCopyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard?.writeText(currentUser.uid);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      setResetError('');
      await resetPassword(currentUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      setResetError(err.message || 'Failed to send password reset email.');
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  const userEmail = currentUser?.email || 'analyst@linksentry.io';
  const userUid = currentUser?.uid ? currentUser.uid : 'N/A';
  const creationDate = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Active Session';
  
  const avatarInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'LS';

  const faqTopics = [
    {
      id: 'how-it-works',
      title: 'How LinkSentry Detects Phishing Attacks',
      content: 'LinkSentry uses a hybrid threat engine combining lexical heuristics, domain typosquatting detection, homograph checks, and ML classifiers to detect zero-day phishing links, optical QR attacks, and deceptive SMS messages in real time.'
    },
    {
      id: 'url-detection',
      title: 'URL & Domain Analysis Scope',
      content: 'Every submitted link is decomposed into protocols, subdomains, host entropy, and path structures. It validates trusted domain overrides while actively flagging suspicious impersonations and malicious TLDs.'
    },
    {
      id: 'qr-quishing',
      title: 'QR Code & Optical Defense',
      content: 'The Optical QR Scanner decodes QR barcodes client-side using jsQR, extracting embedded URLs, Wi-Fi credentials, vCards, or SMS triggers, safely inspecting payloads before network execution.'
    },
    {
      id: 'message-smishing',
      title: 'SMS & Chat Smishing Protection',
      content: 'The Message Scanner analyzes conversational text for urgent financial coercion, banking fraud triggers, and deceptive embedded hyperlinks, calculating multi-signal risk scores.'
    },
    {
      id: 'cloud-privacy',
      title: 'Cloud Synchronization & Privacy',
      content: 'Scan history and preferences are isolated per authenticated user via Firebase Auth and Cloud Firestore rules. Disabling Cloud Synchronization keeps all scan evaluations strictly ephemeral.'
    }
  ];

  return (
    <div className="page-container profile-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-safe)' }} />
            <span className="font-mono">USER SETTINGS & PREFERENCES</span>
          </div>
          <h1 className="page-main-heading">Profile & Security Settings</h1>
          <p className="page-subheading">
            Manage your account security, interface appearance, real-time threat protection preferences, and synchronized cloud telemetry.
          </p>
        </div>

        {/* Auth Status Banner */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">🛡️</div>
          <div className="status-text-group">
            <strong className="status-title">Firebase Session Active & Protected</strong>
            <p className="status-body">
              Authenticated as <strong className="font-mono" style={{ color: 'var(--brand-cyan)' }}>{userEmail}</strong>. Multi-tenant data isolation is active.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="profile-logout-btn"
          >
            {isLoggingOut ? 'Signing Out...' : '🚪 Sign Out'}
          </button>
        </div>

        <div className="profile-layout-grid">
          {/* Left Column: User Account Card */}
          <div className="cyber-card profile-card">
            <div className="profile-avatar-box">
              <div className="profile-avatar-circle">
                <span className="avatar-initials font-mono">{avatarInitials}</span>
              </div>
              <div className="profile-identity">
                <h3 className="profile-name font-mono" title={userEmail}>{userEmail}</h3>
                <span className="profile-role font-mono" style={{ color: 'var(--brand-cyan)' }}>Security Analyst</span>
                <span className="profile-org">LinkSentry Defense Cloud</span>
              </div>
            </div>

            <div className="profile-meta-list">
              <div className="profile-meta-row">
                <span className="meta-label">Account Email</span>
                <span className="meta-val font-mono" title={userEmail} data-testid="profile-user-email">
                  {userEmail}
                </span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Protection Tier</span>
                <span className="meta-val badge-tier">Standard Analyst</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Session Joined</span>
                <span className="meta-val font-mono">{creationDate}</span>
              </div>
            </div>

            {/* Account Actions */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePasswordReset}
                disabled={resetSent}
              >
                {resetSent ? '✓ Reset Link Sent' : '🔑 Send Password Reset Link'}
              </button>
              {resetError && <span className="text-red text-xs font-mono">{resetError}</span>}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Terminating Session...' : '🔒 Sign Out / Lock Session'}
              </button>

              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-phishing-text)', border: '1px solid var(--status-phishing-border)' }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ Delete Account
              </button>
            </div>

            {showDeleteConfirm && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--status-phishing-bg)', border: '1px solid var(--status-phishing-border)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--status-phishing-text)', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Permanent Account Deletion</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 0.75rem 0' }}>
                  Are you sure? This will delete your Firebase account and cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'var(--status-phishing)', color: '#fff' }}
                    onClick={async () => {
                      try {
                        if (deleteUserAccount) {
                          await deleteUserAccount();
                        }
                      } catch (err) {
                        setResetError(err.message || 'Failed to delete account.');
                      }
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Appearance, Preferences, Help & Support */}
          <div className="profile-settings-col">
            {/* 1. Appearance Setting */}
            <div className="cyber-card profile-preferences-card">
              <h3 className="card-title">Appearance</h3>
              <p className="card-subtitle">
                Select your preferred color theme. Synchronizes across your web and mobile devices.
              </p>

              <div className="theme-selector-grid">
                <button
                  type="button"
                  className={`theme-option-card ${theme === 'system' ? 'active' : ''}`}
                  onClick={() => setTheme('system')}
                  data-testid="theme-option-system"
                >
                  <span className="theme-option-icon">💻</span>
                  <div className="theme-option-text">
                    <span className="theme-option-name">System default</span>
                    <span className="theme-option-desc">Matches device OS setting</span>
                  </div>
                  {theme === 'system' && <span className="theme-active-check">✓</span>}
                </button>

                <button
                  type="button"
                  className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                  data-testid="theme-option-light"
                >
                  <span className="theme-option-icon">☀️</span>
                  <div className="theme-option-text">
                    <span className="theme-option-name">Light</span>
                    <span className="theme-option-desc">Clean, high-contrast light surfaces</span>
                  </div>
                  {theme === 'light' && <span className="theme-active-check">✓</span>}
                </button>

                <button
                  type="button"
                  className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                  data-testid="theme-option-dark"
                >
                  <span className="theme-option-icon">🌙</span>
                  <div className="theme-option-text">
                    <span className="theme-option-name">Dark</span>
                    <span className="theme-option-desc">Refined cybersecurity dark mode</span>
                  </div>
                  {theme === 'dark' && <span className="theme-active-check">✓</span>}
                </button>
              </div>
            </div>

            {/* 2. Security Preferences */}
            <div className="cyber-card profile-preferences-card">
              <h3 className="card-title">Security Preferences</h3>
              <p className="card-subtitle">
                Configure real-time threat detection, clipboard integration, and cloud sync policies.
              </p>

              <div className="preferences-list">
                {/* Real-time Threat Detection */}
                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-title">Real-time Threat Detection</span>
                    <span className="preference-desc">
                      Continuously validates URLs, QR codes, and messages against live heuristic engines.
                    </span>
                  </div>
                  <label className="switch" aria-label="Toggle Real-time Threat Detection">
                    <input
                      type="checkbox"
                      checked={securityPreferences.realTimeDetection}
                      onChange={(e) => updateSecurityPreference('realTimeDetection', e.target.checked)}
                      data-testid="pref-realtime"
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Cloud Synchronization */}
                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-title">Cloud Synchronization</span>
                    <span className="preference-desc">
                      Securely syncs your scan history and threat logs across connected endpoints.
                    </span>
                  </div>
                  <label className="switch" aria-label="Toggle Cloud Synchronization">
                    <input
                      type="checkbox"
                      checked={securityPreferences.cloudSync}
                      onChange={(e) => updateSecurityPreference('cloudSync', e.target.checked)}
                      data-testid="pref-cloudsync"
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Clipboard Detection */}
                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-title">Clipboard Quick-Scan</span>
                    <span className="preference-desc">
                      Allows rapid pasting and validation of links directly from your clipboard.
                    </span>
                  </div>
                  <label className="switch" aria-label="Toggle Clipboard Quick-Scan">
                    <input
                      type="checkbox"
                      checked={securityPreferences.clipboardDetection}
                      onChange={(e) => updateSecurityPreference('clipboardDetection', e.target.checked)}
                      data-testid="pref-clipboard"
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Push Notifications */}
                <div className="preference-item">
                  <div className="preference-info">
                    <span className="preference-title">Threat Alert Notifications</span>
                    <span className="preference-desc">
                      Receive browser alerts when high-risk or confirmed phishing attacks are detected.
                    </span>
                  </div>
                  <label className="switch" aria-label="Toggle Threat Alert Notifications">
                    <input
                      type="checkbox"
                      checked={securityPreferences.pushNotifications}
                      onChange={(e) => updateSecurityPreference('pushNotifications', e.target.checked)}
                      data-testid="pref-notifications"
                    />
                    <span className="slider round" />
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Help & Support Accordion */}
            <div className="cyber-card profile-preferences-card">
              <div className="card-header-row">
                <div>
                  <h3 className="card-title">Help & Support</h3>
                  <p className="card-subtitle">Frequently asked questions and threat intelligence guidance</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowFeedbackModal(true)}
                  data-testid="profile-feedback-btn"
                >
                  💬 Send Feedback
                </button>
              </div>

              <div className="faq-accordion-list">
                {faqTopics.map((faq) => {
                  const isOpen = expandedTopic === faq.id;
                  return (
                    <div key={faq.id} className="faq-item">
                      <button
                        type="button"
                        className={`faq-question-btn ${isOpen ? 'open' : ''}`}
                        onClick={() => setExpandedTopic(isOpen ? null : faq.id)}
                      >
                        <span>{faq.title}</span>
                        <span className="faq-arrow">{isOpen ? '▲' : '▼'}</span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer-body animate-fade-in">
                          <p>{faq.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Advanced & Diagnostics (Collapsible) */}
            <div className="cyber-card profile-preferences-card">
              <div className="card-header-row" style={{ cursor: 'pointer' }} onClick={() => setShowDevDiagnostics(!showDevDiagnostics)}>
                <div>
                  <h3 className="card-title">Advanced Diagnostics</h3>
                  <p className="card-subtitle">Endpoint health, API routing, and debug diagnostics</p>
                </div>
                <span className="font-mono text-sm" style={{ color: 'var(--brand-cyan)' }}>
                  {showDevDiagnostics ? '▲ Collapse' : '▼ Expand'}
                </span>
              </div>

              {showDevDiagnostics && (
                <div className="dev-diagnostics-body animate-fade-in" style={{ marginTop: '1.25rem' }}>
                  <div className="preference-item" style={{ borderBottom: 'none' }}>
                    <div className="preference-info">
                      <span className="preference-title">Backend API Health</span>
                      <span className="preference-desc font-mono">
                        Status: <strong style={{ color: backendHealth.status === 'online' ? 'var(--status-safe-text)' : 'var(--status-phishing-text)' }}>
                          {backendHealth.text}
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => probeBackendHealth(apiBaseUrl)}
                      disabled={isProbing}
                    >
                      {isProbing ? 'Probing...' : '⚡ Ping Endpoint'}
                    </button>
                  </div>

                  {/* Firebase UID Info */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="form-label">Firebase Account UID</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input
                        type="text"
                        readOnly
                        className="form-input font-mono"
                        value={userUid}
                        data-testid="profile-user-uid"
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleCopyUid}>
                        {copiedKey ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
}
