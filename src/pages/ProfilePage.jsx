import { useState } from 'react';
import { MOCK_USER_PROFILE } from '../data/mockData';

/**
 * ProfilePage Component
 * Displays user profile, security preferences, and mock API credentials
 * 
 * TODO: In Stage 2, connect to Firebase Authentication (firebase/auth) & Firestore user document
 */
export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState(MOCK_USER_PROFILE);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleTogglePreference = (key) => {
    setUserProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key]
      }
    }));
    setSaveStatus('Preferences saved locally (Stage 1 mock state).');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(userProfile.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="page-container profile-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#06b6d4' }} />
            <span className="font-mono text-cyan">ANALYST CREDENTIALS & WORKSPACE</span>
          </div>
          <h1 className="page-main-heading">User Profile & Security Settings</h1>
          <p className="page-subheading">
            Manage your analyst identity, security preferences, and automated threat defense parameters.
          </p>
        </div>

        {/* Stage 1 Notice */}
        <div className="cyber-card mock-notice-banner">
          <div className="notice-icon">👤</div>
          <div className="notice-text-group">
            <strong className="notice-title">Stage 1 Notice: Authentication Placeholder</strong>
            <p className="notice-body">
              Authentication is currently mocked. In <strong>Stage 2</strong>, this will integrate with <strong>Firebase Authentication</strong> (Email/Password, Google OAuth, Enterprise SSO, and Multi-Factor Auth).
            </p>
          </div>
          <span className="font-mono mock-badge">FIREBASE AUTH: PLANNED</span>
        </div>

        <div className="profile-layout-grid">
          {/* Left Column: User Card */}
          <div className="cyber-card profile-card">
            <div className="profile-avatar-box">
              <div className="profile-avatar-circle">
                <span className="avatar-initials font-mono">{userProfile.avatarInitials}</span>
              </div>
              <div className="profile-identity">
                <h3 className="profile-name">{userProfile.name}</h3>
                <span className="profile-role text-cyan font-mono">{userProfile.role}</span>
                <span className="profile-org">{userProfile.organization}</span>
              </div>
            </div>

            <div className="profile-meta-list">
              <div className="profile-meta-row">
                <span className="meta-label">Email Address</span>
                <span className="meta-val font-mono">{userProfile.email}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Subscription Tier</span>
                <span className="meta-val badge-tier">{userProfile.tier}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Member Since</span>
                <span className="meta-val font-mono">{userProfile.joinedDate}</span>
              </div>
              <div className="profile-meta-row">
                <span className="meta-label">Scans Performed</span>
                <span className="meta-val font-mono text-green">{userProfile.totalScansRan} scans</span>
              </div>
            </div>

            <div className="profile-auth-status">
              <span className="cyber-badge-dot" style={{ backgroundColor: '#10b981' }} />
              <span className="status-label font-mono">Simulated Session: SOC-ANALYST-ACTIVE</span>
            </div>
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
                  Keep this token private. Stage 2 will allow token rotation and revocation.
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
