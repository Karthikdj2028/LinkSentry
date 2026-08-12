import { useState } from 'react';
import { useAuth } from '../context';
import { MOCK_USER_PROFILE } from '../data/mockData';

/**
 * ProfilePage Component
 * Displays authenticated user details from Firebase Auth, security preferences, and mock API credentials
 */
export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(MOCK_USER_PROFILE);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleTogglePreference = (key) => {
    setUserProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key]
      }
    }));
    setSaveStatus('Preferences saved successfully.');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(userProfile.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // Auth state listener in AuthContext will automatically transition user to login screen
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  // Derive display values from authenticated Firebase user
  const userEmail = currentUser?.email || userProfile.email;
  const userUid = currentUser?.uid ? `${currentUser.uid.slice(0, 12)}...` : 'SOC-ANALYST-01';
  const creationDate = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : userProfile.joinedDate;
  
  const avatarInitials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : userProfile.avatarInitials;

  return (
    <div className="page-container profile-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
            <span className="font-mono text-cyan">FIREBASE AUTHENTICATED WORKSPACE</span>
          </div>
          <h1 className="page-main-heading">User Profile & Security Settings</h1>
          <p className="page-subheading">
            Manage your authenticated analyst identity, session credentials, and threat defense parameters.
          </p>
        </div>

        {/* Auth Status Notice */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">🔐</div>
          <div className="status-text-group">
            <strong className="status-title">Firebase Authentication Session Active</strong>
            <p className="status-body">
              Signed in as <strong className="font-mono text-cyan">{userEmail}</strong>. Your session is securely authenticated via Firebase Client Auth with persistent browser state.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging Out...' : '🚪 Sign Out'}
          </button>
        </div>

        <div className="profile-layout-grid">
          {/* Left Column: User Card */}
          <div className="cyber-card profile-card">
            <div className="profile-avatar-box">
              <div className="profile-avatar-circle">
                <span className="avatar-initials font-mono">{avatarInitials}</span>
              </div>
              <div className="profile-identity">
                <h3 className="profile-name font-mono">{userEmail.split('@')[0]}</h3>
                <span className="profile-role text-cyan font-mono">{userProfile.role}</span>
                <span className="profile-org">{userProfile.organization}</span>
              </div>
            </div>

            <div className="profile-meta-list">
              <div className="profile-meta-row">
                <span className="meta-label">Authenticated Email</span>
                <span className="meta-val font-mono text-cyan" title={userEmail}>
                  {userEmail}
                </span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Firebase UID</span>
                <span className="meta-val font-mono text-muted" title={currentUser?.uid || ''}>
                  {userUid}
                </span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Subscription Tier</span>
                <span className="meta-val badge-tier">{userProfile.tier}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Account Created</span>
                <span className="meta-val font-mono">{creationDate}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Scans Performed</span>
                <span className="meta-val font-mono text-green">{userProfile.totalScansRan} scans</span>
              </div>
            </div>

            <div className="profile-auth-status">
              <span className="cyber-badge-dot" style={{ backgroundColor: '#10b981' }} />
              <span className="status-label font-mono">Firebase Session: ACTIVE</span>
            </div>

            {/* Prominent Sign Out Button */}
            <button
              type="button"
              className="btn btn-secondary logout-action-card-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Terminating Security Session...' : '🔒 Sign Out / Lock Console'}
            </button>
          </div>

          {/* Right Column: Security Preferences & API Credentials */}
          <div className="profile-settings-col">
            {/* API Credentials Card */}
            <div className="cyber-card profile-api-card">
              <h3 className="card-title">Security Analyst API Token</h3>
              <p className="card-subtitle">
                Used to authenticate automated CI/CD pipelines, browser extensions, and mobile endpoints.
              </p>

              <div className="api-key-box">
                <div className="api-key-input-row">
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    readOnly
                    className="form-input font-mono api-input"
                    value={userProfile.apiKey}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  >
                    {apiKeyVisible ? '🙈 Hide' : '👁 Show'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCopyKey}
                  >
                    {copiedKey ? '✓ Copied' : '📋 Copy Token'}
                  </button>
                </div>
                <span className="api-key-hint font-mono">
                  Keep this API token private. Use this token for programmatic scanner integrations.
                </span>
              </div>
            </div>

            {/* Notification & Protection Preferences */}
            <div className="cyber-card profile-preferences-card">
              <h3 className="card-title">Detection & Alert Preferences</h3>
              <p className="card-subtitle">
                Configure real-time alerting, quarantine triggers, and security thresholds.
              </p>

              <div className="preferences-list">
                <div className="preference-toggle-row">
                  <div className="pref-info">
                    <strong>Real-Time Threat Notifications</strong>
                    <p>Receive instant notifications whenever a high-risk phishing URL or QR code is detected.</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${userProfile.preferences.realTimeAlerts ? 'toggle-on' : ''}`}
                    onClick={() => handleTogglePreference('realTimeAlerts')}
                    aria-label="Toggle real-time alerts"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                <div className="preference-toggle-row">
                  <div className="pref-info">
                    <strong>Automated Quarantine & DNS Blacklist</strong>
                    <p>Automatically generate firewall and Pi-hole block rules for confirmed malicious domains.</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${userProfile.preferences.autoQuarantine ? 'toggle-on' : ''}`}
                    onClick={() => handleTogglePreference('autoQuarantine')}
                    aria-label="Toggle auto quarantine"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>

                <div className="preference-toggle-row">
                  <div className="pref-info">
                    <strong>Anonymous Threat Telemetry Sharing</strong>
                    <p>Contribute anonymized threat vectors to global threat intelligence networks.</p>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${userProfile.preferences.telemetrySharing ? 'toggle-on' : ''}`}
                    onClick={() => handleTogglePreference('telemetrySharing')}
                    aria-label="Toggle telemetry sharing"
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </div>

              {saveStatus && (
                <div className="save-status-banner animate-fade-in font-mono">
                  ✓ {saveStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
