import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { useAuth } from '../context';
import { subscribeToUserScans } from '../firebase';

/**
 * Format Firestore timestamp safely.
 * Handles Firestore Timestamp objects, JS Dates, ISO strings, and null/undefined values.
 */
function formatFirestoreTimestamp(createdAt) {
  if (!createdAt) {
    return 'Pending timestamp';
  }

  try {
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    if (typeof createdAt.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const parsedDate = new Date(createdAt);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (err) {
    console.error('Error formatting timestamp:', err);
  }

  return 'Pending timestamp';
}

/**
 * Format verdict string for UI display
 */
function formatVerdict(verdict) {
  if (!verdict) return 'Safe';
  const str = String(verdict).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * DashboardPage Component
 * Computes live cybersecurity telemetry, detection rates, vector distribution,
 * and security health scores from the authenticated user's Cloud Firestore scan history.
 */
export default function DashboardPage({ onNavigateToScanner }) {
  const { currentUser } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = currentUser?.uid;

  // Real-time bidirectional telemetry streaming with Cloud Firestore
  useEffect(() => {
    if (!userId) {
      const timer = setTimeout(() => {
        setLoading(false);
        setScans([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setLoading(true), 0);
    const unsubscribe = subscribeToUserScans(
      userId,
      (liveScans) => {
        setScans(liveScans);
        setError('');
        setLoading(false);
      },
      (err) => {
        console.error('Failed to stream dashboard telemetry:', err);
        setError('Cloud telemetry unavailable. Unable to retrieve scan statistics.');
        setLoading(false);
      },
      100
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  // -------------------------------------------------------------------------
  // TELEMETRY CALCULATIONS (Derived from real Firestore scan records)
  // -------------------------------------------------------------------------

  // 1. Total Scans Count
  const totalScans = scans.length;

  // 2. Breakdown by Verdict (case-insensitive)
  const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
  const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
  const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;

  // Percentages by Verdict
  const safePercentage = totalScans === 0 ? 0 : Math.round((safeScans / totalScans) * 100);
  const suspiciousPercentage = totalScans === 0 ? 0 : Math.round((suspiciousScans / totalScans) * 100);
  const phishingPercentage = totalScans === 0 ? 0 : Math.round((phishingScans / totalScans) * 100);

  // 3. Threat Detection Rate: ((suspicious + phishing) / totalScans) * 100
  const detectionRate = totalScans === 0
    ? 0
    : Math.round(((suspiciousScans + phishingScans) / totalScans) * 100);

  // 4. Threat Vector Distribution Breakdown
  const urlCount = scans.filter((s) => (s.type || 'url').toLowerCase() === 'url').length;
  const qrCount = scans.filter((s) => (s.type || '').toLowerCase() === 'qr').length;
  const messageCount = scans.filter((s) => (s.type || '').toLowerCase() === 'message').length;

  const urlPercentage = totalScans === 0 ? 0 : Math.round((urlCount / totalScans) * 100);
  const qrPercentage = totalScans === 0 ? 0 : Math.round((qrCount / totalScans) * 100);
  const messagePercentage = totalScans === 0 ? 0 : Math.round((messageCount / totalScans) * 100);

  const threatVectors = [
    { name: 'URL / Web Links', count: urlCount, percentage: urlPercentage, color: '#06b6d4' },
    { name: 'QR Optical Codes', count: qrCount, percentage: qrPercentage, color: '#8b5cf6' },
    { name: 'SMS / Direct Messages', count: messageCount, percentage: messagePercentage, color: '#ec4899' },
  ];

  // 5. Security Health Score (Application Telemetry metric based on ratio of safe scans)
  // Non-formal metric: 100 if no scans, otherwise percentage of clean targets
  const healthScore = totalScans === 0
    ? 100
    : Math.round((safeScans / totalScans) * 100);

  // 6. Recent High-Risk Alerts (riskScore >= 70 or confirmed phishing verdict)
  const highRiskAlerts = scans.filter((s) => {
    const risk = typeof s.riskScore === 'number' ? s.riskScore : (s.risk_score || 0);
    const verdict = (s.verdict || '').toLowerCase();
    return risk >= 70 || verdict === 'phishing';
  });

  return (
    <div className="page-container dashboard-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
            <span className="font-mono text-cyan">CLOUD FIRESTORE TELEMETRY INTELLIGENCE</span>
          </div>
          <h1 className="page-main-heading">Phishing Telemetry & Dashboard</h1>
          <p className="page-subheading">
            Live telemetry, threat vector distribution, and security health metrics derived from your Cloud Firestore scan history.
          </p>
        </div>

        {/* Firestore Sync Banner */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">📊</div>
          <div className="status-text-group">
            <strong className="status-title">Real-Time Security Telemetry Synchronized</strong>
            <p className="status-body">
              Aggregating live threat telemetry from your synchronized Cloud Firestore cluster.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleRefresh}
            disabled={loading}
            title="Recalculate dashboard statistics from Firestore"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Telemetry'}
          </button>
        </div>

        {/* Loading State */}
        {loading && scans.length === 0 && (
          <div className="cyber-card scanning-in-progress" style={{ padding: '4rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div className="scanning-radar-container">
              <div className="scanning-radar-sweep" />
              <div className="scanning-radar-grid" />
              <div className="scanning-radar-crosshair" />
            </div>
            <div className="scanning-status-texts font-mono">
              <p className="status-primary-text">CALCULATING TELEMETRY METRICS...</p>
              <p className="status-sub-text">Querying Cloud Firestore audit trail for authenticated session...</p>
            </div>
          </div>
        )}

        {/* Error State with Retry Action */}
        {!loading && error && (
          <div className="cyber-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>⚠️</span>
            <h3 style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>Cloud Telemetry Unavailable</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRefresh}
            >
              🔄 Retry Telemetry Query
            </button>
          </div>
        )}

        {/* Empty State: Zero Scans Recorded in Firestore */}
        {!loading && !error && scans.length === 0 && (
          <div className="cyber-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No scan telemetry available yet</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
              Dashboard metrics, threat vectors, and detection rates will automatically calculate as you perform scans.
            </p>
            {onNavigateToScanner && (
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => onNavigateToScanner('url')}
              >
                Launch URL Scanner ➔
              </button>
            )}
          </div>
        )}

        {/* Main Dashboard Content (Only when scans exist or after initial load) */}
        {(!loading || scans.length > 0) && !error && scans.length > 0 && (
          <>
            {/* 4 Primary Metric Stat Cards */}
            <div className="grid grid-cols-4 dashboard-stats-grid">
              <StatCard
                title="Total Scans Executed"
                value={totalScans.toLocaleString()}
                subtitle="All recorded scan assessments"
                variant="cyan"
                icon="🛡️"
                badge={`Detection Rate: ${detectionRate}%`}
              />

              <StatCard
                title="Safe Targets"
                value={safeScans.toLocaleString()}
                subtitle="Verified clean inspection results"
                variant="green"
                icon="✅"
                badge={`${safePercentage}%`}
              />

              <StatCard
                title="Suspicious Threats"
                value={suspiciousScans.toLocaleString()}
                subtitle="Anomalies flagged for caution"
                variant="amber"
                icon="⚠️"
                badge={`${suspiciousPercentage}%`}
              />

              <StatCard
                title="Phishing Blocked"
                value={phishingScans.toLocaleString()}
                subtitle="Confirmed malicious attacks"
                variant="red"
                icon="🚫"
                badge={`${phishingPercentage}%`}
              />
            </div>

            {/* Middle Section: Threat Vectors & System Health */}
            <div className="dashboard-middle-grid">
              {/* Left: Threat Vector Distribution */}
              <div className="cyber-card dashboard-vector-card">
                <div className="card-header-row">
                  <div>
                    <h3 className="card-title">Threat Vector Distribution</h3>
                    <p className="card-subtitle">Attack surface breakdown across supported scanning vectors</p>
                  </div>
                  <span className="font-mono text-cyan text-sm">FIRESTORE AGGREGATE</span>
                </div>

                <div className="vector-bars-list">
                  {threatVectors.map((vector) => (
                    <div key={vector.name} className="vector-bar-item">
                      <div className="vector-bar-label-row">
                        <span className="vector-name">{vector.name}</span>
                        <span className="vector-count font-mono">
                          {vector.count.toLocaleString()} scans ({vector.percentage}%)
                        </span>
                      </div>
                      <div className="vector-bar-track">
                        <div
                          className="vector-bar-fill"
                          style={{
                            width: `${vector.percentage}%`,
                            backgroundColor: vector.color,
                            boxShadow: `0 0 10px ${vector.color}66`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="vector-footer-meta">
                  <div className="meta-pill">
                    <span className="meta-label">Active Threat Intercepts:</span>
                    <span className="meta-val font-mono text-red">{phishingScans + suspiciousScans}</span>
                  </div>
                  <div className="meta-pill">
                    <span className="meta-label">Total URLs Evaluated:</span>
                    <span className="meta-val font-mono text-cyan">{urlCount}</span>
                  </div>
                </div>
              </div>

              {/* Right: Security Posture Health Box */}
              <div className="cyber-card dashboard-health-card">
                <h3 className="card-title">Security Health Index</h3>
                <p className="card-subtitle">Application telemetry ratio of verified clean scans</p>

                <div className="health-score-dial">
                  <div className="health-dial-circle">
                    <span className="health-dial-number font-mono">{healthScore}%</span>
                    <span className="health-dial-label">Clean Ratio</span>
                  </div>
                </div>

                <div className="health-checklist">
                  <div className="health-check-row">
                    <span className="check-icon text-green">●</span>
                    <span>URL Detonation Engine: <strong>ONLINE</strong></span>
                  </div>
                  <div className="health-check-row">
                    <span className="check-icon text-green">●</span>
                    <span>Cloud Firestore Sync: <strong>CONNECTED</strong></span>
                  </div>
                  <div className="health-check-row">
                    <span className="check-icon text-green">●</span>
                    <span>Firebase Auth Session: <strong>ACTIVE</strong></span>
                  </div>
                  <div className="health-check-row">
                    <span className="check-icon text-green">●</span>
                    <span>Real-Time Interception: <strong>OPERATIONAL</strong></span>
                  </div>
                </div>

                {onNavigateToScanner && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm health-action-btn"
                    onClick={() => onNavigateToScanner('url')}
                  >
                    Launch Unified Scanner ➔
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Section: Recent High-Risk Alerts Feed */}
            <div className="cyber-card dashboard-alerts-card">
              <div className="card-header-row">
                <div>
                  <h3 className="card-title">Recent High-Risk Security Alerts</h3>
                  <p className="card-subtitle">Real high-risk threats (risk score ≥ 70 or phishing verdict)</p>
                </div>
                <span className="font-mono text-red text-sm">
                  {highRiskAlerts.length} CRITICAL ALERTS
                </span>
              </div>

              {highRiskAlerts.length > 0 ? (
                <div className="alerts-feed-list">
                  {highRiskAlerts.slice(0, 5).map((alert) => {
                    const alertRisk = typeof alert.riskScore === 'number' ? alert.riskScore : (alert.risk_score || 0);
                    const alertVerdict = formatVerdict(alert.verdict);
                    const alertDate = formatFirestoreTimestamp(alert.createdAt);
                    const alertTarget = alert.input || alert.url || 'Unknown target';
                    const alertDetails = alert.indicators && alert.indicators.length > 0
                      ? alert.indicators.join(' • ')
                      : (alert.domain ? `Suspicious indicators observed on host ${alert.domain}` : 'Phishing behavior detected.');

                    return (
                      <div key={alert.id} className="alert-feed-item">
                        <div className="alert-feed-header">
                          <div className="alert-title-group">
                            <Badge status={alertVerdict} size="sm">
                              {alertVerdict} ({alertRisk}/100)
                            </Badge>
                            <span className="alert-item-title font-mono" title={alertTarget}>
                              {alertTarget}
                            </span>
                          </div>
                          <span className="alert-timestamp font-mono">{alertDate}</span>
                        </div>
                        <p className="alert-details-text">{alertDetails}</p>
                        <div className="alert-vector-tag font-mono">
                          Vector: <strong>{(alert.type || 'URL').toUpperCase()}</strong> • Engine: <strong>{alert.engine || 'Rule-Based'}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-box" style={{ padding: '2rem', textAlign: 'center' }}>
                  <span className="empty-state-icon" style={{ fontSize: '2rem' }}>✅</span>
                  <h4 style={{ color: '#fff', margin: '0.5rem 0' }}>No high-risk alerts detected</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Your scan history currently contains no critical phishing threats or high-risk assessments (risk score ≥ 70).
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
