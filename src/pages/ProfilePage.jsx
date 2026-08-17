import { useState, useMemo } from 'react';
import { useAuth, useTheme, useScans } from '../context';
import FeedbackModal from '../components/FeedbackModal';

/**
 * Format auth metadata timestamps safely.
 */
function formatAuthDate(dateStr) {
  if (!dateStr) return 'Unavailable';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unavailable';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unavailable';
  }
}

/**
 * Detect authentication provider information cleanly from currentUser.providerData.
 */
function getAuthProviderInfo(currentUser) {
  if (!currentUser) return { name: 'Unknown', icon: '🛡️', isGoogle: false, isPassword: false };
  const providerData = currentUser.providerData || [];
  const isGoogle = providerData.some((p) => p.providerId === 'google.com');
  const isPassword = providerData.some((p) => p.providerId === 'password');

  if (isGoogle) {
    return { name: 'Google Account', icon: '🌐', isGoogle: true, isPassword: false };
  }
  if (isPassword) {
    return { name: 'Email & Password', icon: '🔑', isGoogle: false, isPassword: true };
  }
  if (providerData.length > 0 && providerData[0].providerId) {
    return { name: providerData[0].providerId, icon: '🛡️', isGoogle: false, isPassword: false };
  }
  return { name: 'Email & Password', icon: '🔑', isGoogle: false, isPassword: true };
}

/**
 * ProfilePage Component
 * Provides account security overview, multi-signal telemetry summary,
 * cloud sync & threat sharing toggles, 3-state theme selector, and session controls.
 */
export default function ProfilePage() {
  const { currentUser, logout, resetPassword } = useAuth();
  const { theme, setTheme, securityPreferences, updateSecurityPreference } = useTheme();
  const { scans } = useScans();

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState(null);

  const userEmail = currentUser?.email || 'analyst@linksentry.io';
  const avatarInitials = userEmail.length >= 2 ? userEmail.slice(0, 2).toUpperCase() : 'LS';
  const providerInfo = getAuthProviderInfo(currentUser);

  const creationDate = formatAuthDate(currentUser?.metadata?.creationTime);
  const lastSignInDate = formatAuthDate(currentUser?.metadata?.lastSignInTime);

  // Memoized Scan Telemetry Summary
  const telemetrySummary = useMemo(() => {
    const totalScans = scans ? scans.length : 0;
    const threatsDetected = scans ? scans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length : 0;
    const safeScans = totalScans - threatsDetected;
    const safeRatio = totalScans === 0 ? 100 : Math.round((safeScans / totalScans) * 100);
    const isCloudSyncOn = securityPreferences?.cloudSync !== false;

    return {
      totalScans,
      threatsDetected,
      safeRatio,
      cloudSyncStatus: isCloudSyncOn ? 'Cloud Synced' : 'Device Vault Only'
    };
  }, [scans, securityPreferences]);

  const handleCopyEmail = () => {
    if (userEmail && navigator.clipboard) {
      navigator.clipboard.writeText(userEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
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

  const faqTopics = [
    {
      id: 'how-it-works',
      title: 'How LinkSentry Evaluates Threats',
      content: 'LinkSentry uses a multi-signal detection pipeline combining lexical parsing, domain typosquatting detection, homograph checks, and ML heuristic classifiers to detect zero-day phishing links, optical QR quishing vectors, and deceptive SMS messages in real time.'
    },
    {
      id: 'url-detection',
      title: 'URL & Domain Analysis Scope',
      content: 'Submitted links are decomposed into protocol, subdomains, host entropy, and path structure. The engine validates trusted infrastructure overrides while actively flagging suspicious impersonation targets and malicious top-level domains.'
    },
    {
      id: 'qr-quishing',
      title: 'QR Code & Optical Radar Defense',
      content: 'The Optical QR Scanner decodes QR barcodes client-side with jsQR, extracting embedded URLs, Wi-Fi credentials, vCards, or SMS triggers, safely inspecting payloads before network execution.'
    },
    {
      id: 'message-smishing',
      title: 'SMS & Chat Smishing NLP Heuristics',
      content: 'The Message Scanner analyzes conversational text for urgency coercion, banking alert triggers, and deceptive embedded hyperlinks, calculating multi-signal risk scores.'
    },
    {
      id: 'cloud-privacy',
      title: 'Cloud Synchronization & Multi-Tenant Isolation',
      content: 'Scan history and security preferences are isolated per authenticated user via Firebase Auth and Cloud Firestore rules. Disabling Cloud Synchronization keeps all scan evaluations strictly local to this device.'
    }
  ];

  return (
    <div className="page-container profile-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">USER SETTINGS & ACCOUNT CONTROL</span>
          </div>
          <h1 className="page-main-heading">Profile & Account Security</h1>
          <p className="page-subheading">
            Manage your authenticated identity, security preferences, data telemetry controls, and interface appearance.
          </p>
        </div>

        {/* Profile Hero Card */}
        <div className="cyber-card profile-hero-card" style={{ marginBottom: '2rem' }}>
          <div className="profile-hero-content">
            <div className="profile-avatar-circle">
              <span className="avatar-initials font-mono">{avatarInitials}</span>
            </div>
            <div className="profile-hero-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 className="profile-hero-email font-mono">{userEmail}</h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm copy-email-btn"
                  onClick={handleCopyEmail}
                  title="Copy email to clipboard"
                  aria-label="Copy email"
                >
                  {copiedEmail ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="profile-hero-badges">
                <span className="badge-pill badge-info font-mono">
                  {providerInfo.icon} {providerInfo.name}
                </span>
                <span className="badge-pill badge-safe font-mono">
                  ● Active Session
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Top Section: Account Information + Security Summary */}
        <div className="grid grid-cols-2 profile-two-col-grid" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
          {/* Card 1: Account Information */}
          <div className="cyber-card profile-section-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Account Identity</h3>
                <p className="card-subtitle">Verified authentication credentials and session origin</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>
                {providerInfo.isGoogle ? 'OAuth 2.0' : 'Firebase Auth'}
              </span>
            </div>

            <div className="profile-meta-list" style={{ marginTop: '1.25rem' }}>
              <div className="profile-meta-row">
                <span className="meta-label">Account Email</span>
                <span className="meta-val font-mono" title={userEmail} data-testid="profile-user-email">
                  {userEmail}
                </span>
              </div>

              <div className="profile-meta-row">
                <span className="meta-label">Authentication Method</span>
                <span className="meta-val font-mono">
                  {providerInfo.icon} {providerInfo.name}
                </span>
              </div>

              <div className="profile-meta-row">
                <span className="meta-label">Account Created</span>
                <span className="meta-val font-mono">{creationDate}</span>
              </div>

              <div className="profile-meta-row">
                <span className="meta-label">Last Sign-In</span>
                <span className="meta-val font-mono">{lastSignInDate}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Profile Security Summary */}
          <div className="cyber-card profile-section-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Security & Telemetry Summary</h3>
                <p className="card-subtitle">Live posture metrics derived from your investigation activity</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>
                Telemetry
              </span>
            </div>

            <div className="profile-summary-grid" style={{ marginTop: '1.25rem' }}>
              <div className="profile-summary-stat">
                <span className="summary-stat-label font-mono">TOTAL INVESTIGATIONS</span>
                <span className="summary-stat-val font-mono text-cyan">{telemetrySummary.totalScans}</span>
                <span className="summary-stat-sub">Multi-vector scan audits</span>
              </div>

              <div className="profile-summary-stat">
                <span className="summary-stat-label font-mono">THREATS DETECTED</span>
                <span className="summary-stat-val font-mono" style={{ color: telemetrySummary.threatsDetected > 0 ? 'var(--status-phishing)' : 'var(--status-safe)' }}>
                  {telemetrySummary.threatsDetected}
                </span>
                <span className="summary-stat-sub">Phishing & suspicious flags</span>
              </div>

              <div className="profile-summary-stat">
                <span className="summary-stat-label font-mono">SAFE RATIO</span>
                <span className="summary-stat-val font-mono text-green">{telemetrySummary.safeRatio}%</span>
                <span className="summary-stat-sub">Benign payload percentage</span>
              </div>

              <div className="profile-summary-stat">
                <span className="summary-stat-label font-mono">TELEMETRY STORAGE</span>
                <span className="summary-stat-val font-mono" style={{ fontSize: '1.05rem', color: 'var(--brand-cyan)' }}>
                  {telemetrySummary.cloudSyncStatus}
                </span>
                <span className="summary-stat-sub">Multi-device cloud synchronization</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Telemetry Preferences Card */}
        <div className="cyber-card profile-section-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Security & Telemetry Preferences</h3>
              <p className="card-subtitle">Configure cloud synchronization, intelligence sharing, and real-time heuristics</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>Preferences</span>
          </div>

          <div className="preferences-list" style={{ marginTop: '1.25rem' }}>
            {/* 1. Cloud Synchronization */}
            <div className="preference-item">
              <div className="preference-info">
                <strong className="preference-title">Cloud Telemetry Synchronization</strong>
                <p className="preference-desc">
                  Synchronize your multi-vector scan investigations with the LinkSentry Cloud Vault across all authenticated sessions.
                </p>
              </div>
              <label className="switch" aria-label="Toggle Cloud Telemetry Synchronization">
                <input
                  type="checkbox"
                  checked={securityPreferences.cloudSync !== false}
                  onChange={(e) => updateSecurityPreference('cloudSync', e.target.checked)}
                  data-testid="pref-cloudsync"
                />
                <span className="slider round" />
              </label>
            </div>

            {/* 2. Threat Telemetry Sharing */}
            <div className="preference-item">
              <div className="preference-info">
                <strong className="preference-title">Threat Telemetry Intelligence Sharing</strong>
                <p className="preference-desc">
                  Allow anonymized threat indicators to participate in LinkSentry decentralized detection heuristics.
                </p>
              </div>
              <label className="switch" aria-label="Toggle Threat Telemetry Intelligence Sharing">
                <input
                  type="checkbox"
                  checked={securityPreferences.threatSharing !== false}
                  onChange={(e) => updateSecurityPreference('threatSharing', e.target.checked)}
                  data-testid="pref-threatsharing"
                />
                <span className="slider round" />
              </label>
            </div>

            {/* 3. Real-Time Threat Detection */}
            <div className="preference-item">
              <div className="preference-info">
                <strong className="preference-title">Real-Time Multi-Signal Detection</strong>
                <p className="preference-desc">
                  Continuously evaluate submitted targets against hybrid ML models, optical QR decoders, and NLP regex matrices.
                </p>
              </div>
              <label className="switch" aria-label="Toggle Real-Time Multi-Signal Detection">
                <input
                  type="checkbox"
                  checked={securityPreferences.realTimeDetection !== false}
                  onChange={(e) => updateSecurityPreference('realTimeDetection', e.target.checked)}
                  data-testid="pref-realtime"
                />
                <span className="slider round" />
              </label>
            </div>

            {/* 4. Threat Alert Notifications */}
            <div className="preference-item">
              <div className="preference-info">
                <strong className="preference-title">Threat Alert Notifications</strong>
                <p className="preference-desc">
                  Receive browser notifications when high-severity phishing campaigns or credential harvesting lures are flagged.
                </p>
              </div>
              <label className="switch" aria-label="Toggle Threat Alert Notifications">
                <input
                  type="checkbox"
                  checked={securityPreferences.pushNotifications !== false}
                  onChange={(e) => updateSecurityPreference('pushNotifications', e.target.checked)}
                  data-testid="pref-notifications"
                />
                <span className="slider round" />
              </label>
            </div>
          </div>
        </div>

        {/* Interface Appearance Card */}
        <div className="cyber-card profile-section-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Interface Appearance</h3>
              <p className="card-subtitle">Select your preferred color theme. Synchronizes across your workspace</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>Theme</span>
          </div>

          <div className="theme-selector-grid" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className={`theme-option-card ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              data-testid="theme-option-system"
            >
              <span className="theme-option-icon">💻</span>
              <div className="theme-option-text">
                <span className="theme-option-name">System Default</span>
                <span className="theme-option-desc">Matches your operating system preference</span>
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
                <span className="theme-option-desc">High-contrast, clean light surfaces</span>
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
                <span className="theme-option-desc">Refined cybersecurity SOC dark mode</span>
              </div>
              {theme === 'dark' && <span className="theme-active-check">✓</span>}
            </button>
          </div>
        </div>

        {/* Session Security & Actions Card */}
        <div className="cyber-card profile-section-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Session Security & Access Control</h3>
              <p className="card-subtitle">Manage active session authentication state and credential recovery</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>Session</span>
          </div>

          <div className="profile-session-body" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="session-status-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                  Current Active Session
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Authenticated as <strong className="font-mono text-cyan">{userEmail}</strong> via {providerInfo.name}.
                </p>
              </div>
              <div className="session-actions-buttons" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePasswordReset}
                  disabled={resetSent}
                  data-testid="profile-reset-pwd-btn"
                >
                  {resetSent ? '✓ Reset Link Sent' : '🔑 Send Password Reset Link'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  data-testid="profile-logout-btn"
                >
                  {isLoggingOut ? 'Signing Out...' : '🔒 Sign Out'}
                </button>
              </div>
            </div>

            {resetSent && (
              <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7' }}>
                <span className="error-icon">✓</span>
                <span>A password reset email has been dispatched to {userEmail}. Check your inbox.</span>
              </div>
            )}

            {resetError && (
              <div className="auth-error-alert animate-fade-in">
                <span className="error-icon">⚠️</span>
                <span>{resetError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Help, Support & FAQ Card */}
        <div className="cyber-card profile-section-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Help & Threat Intelligence Guidance</h3>
              <p className="card-subtitle">Frequently asked questions and multi-vector detection documentation</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFeedbackModal(true)}
              data-testid="profile-feedback-btn"
            >
              💬 Send Feedback
            </button>
          </div>

          <div className="faq-accordion-list" style={{ marginTop: '1.25rem' }}>
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
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
}

