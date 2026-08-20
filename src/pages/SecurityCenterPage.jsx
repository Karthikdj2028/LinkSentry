import { useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import SecurityAuditReportModal from '../components/SecurityAuditReportModal';
import { useScans, useAuth, useTheme } from '../context';

/**
 * Format Firestore timestamp safely.
 */
function formatFirestoreTimestamp(createdAt) {
  if (!createdAt) return 'Pending timestamp';
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
  return 'Recently';
}

function formatVerdict(verdict) {
  if (!verdict) return 'Safe';
  const str = String(verdict).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * SecurityCenterPage Component
 * Provides live SOC defense rating, multi-signal telemetry sensors,
 * active threat incident quarantine monitor, and security audit report generation.
 */
export default function SecurityCenterPage({ onSelectTab, onNavigateToScanner }) {
  const { scans, error } = useScans();
  const { currentUser } = useAuth();
  const { securityPreferences } = useTheme();

  const [exportNotice, setExportNotice] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Memoized Telemetry Calculations
  const socData = useMemo(() => {
    const totalScans = scans.length;
    const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
    const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
    const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;
    const threatsDetected = suspiciousScans + phishingScans;

    const safePercentage = totalScans === 0 ? 100 : Math.round((safeScans / totalScans) * 100);
    const threatPercentage = totalScans === 0 ? 0 : Math.round((threatsDetected / totalScans) * 100);

    const calculatedScore = totalScans === 0
      ? 98
      : Math.max(10, Math.min(99, Math.round(100 - (phishingScans * 25 + suspiciousScans * 10) / Math.max(1, totalScans))));

    const getScoreStatus = (score) => {
      if (score >= 85) return { label: 'OPTIMAL DEFENSE', color: '#10b981', badgeClass: 'badge-safe', desc: 'Minimal risk exposure detected across audited telemetry channels.' };
      if (score >= 70) return { label: 'ROBUST POSTURE', color: '#06b6d4', badgeClass: 'badge-info', desc: 'Solid defensive profile. Threat markers are localized and categorized.' };
      if (score >= 50) return { label: 'MODERATE RISK', color: '#f59e0b', badgeClass: 'badge-suspicious', desc: 'Elevated threat exposure. Heightened monitoring recommended for unknown links.' };
      return { label: 'CRITICAL POSTURE', color: '#ef4444', badgeClass: 'badge-phishing', desc: 'Severe threat concentration. Active credential lures or phishing kits flagged.' };
    };

    const scoreStatus = getScoreStatus(calculatedScore);

    // Recent Threat Incidents (Non-safe payloads)
    const threatIncidents = scans
      .filter((s) => (s.verdict || '').toLowerCase() !== 'safe')
      .slice(0, 5);

    // Dynamic Defense Infrastructure Controls & Sensors
    const isCloudSyncOn = securityPreferences?.cloudSync !== false;
    const defenseSensors = [
      {
        id: 'ml_engine',
        title: 'AI Multi-Signal Phishing Engine',
        desc: 'LinkSentry hybrid ML inference and regex heuristic matrix evaluating incoming targets.',
        status: 'Active',
        statusType: 'safe',
        icon: '🧠',
        metric: 'V3.4 Hybrid'
      },
      {
        id: 'qr_radar',
        title: 'QR Code / Quishing Optical Radar',
        desc: 'Decoded matrix parsing with homoglyph & shortened redirect analysis.',
        status: 'Protected',
        statusType: 'safe',
        icon: '📷',
        metric: 'Optical Decoders'
      },
      {
        id: 'sms_heuristic',
        title: 'SMS Smishing NLP Heuristics',
        desc: 'Social engineering and urgency pressure keyword detection on message payloads.',
        status: 'Protected',
        statusType: 'safe',
        icon: '💬',
        metric: 'NLP Heuristics'
      },
      {
        id: 'vault_sync',
        title: 'Local & Cloud Vault Sync',
        desc: isCloudSyncOn
          ? 'Firestore real-time cloud synchronization active across authenticated sessions.'
          : 'Local device encryption vault active. Scans remain private to this browser.',
        status: isCloudSyncOn ? 'Cloud Synced' : 'Local Storage Only',
        statusType: isCloudSyncOn ? 'safe' : 'info',
        icon: isCloudSyncOn ? '☁️' : '🔒',
        metric: isCloudSyncOn ? 'Cloud Live' : 'Device Vault'
      }
    ];

    return {
      totalScans,
      safeScans,
      suspiciousScans,
      phishingScans,
      threatsDetected,
      safePercentage,
      threatPercentage,
      calculatedScore,
      scoreStatus,
      threatIncidents,
      defenseSensors
    };
  }, [scans, securityPreferences]);

  // -------------------------------------------------------------------------
  // EXPORT HANDLERS
  // -------------------------------------------------------------------------
  const handleExportAudit = () => {
    if (scans.length === 0) {
      setExportNotice('No scan records available to export.');
      return;
    }

    const headers = ['Record ID', 'Timestamp', 'Vector Type', 'Target / Payload', 'Verdict', 'Risk Score', 'Confidence'];
    const rows = scans.map((s) => [
      `"${s.id || ''}"`,
      `"${formatFirestoreTimestamp(s.createdAt)}"`,
      `"${(s.type || 'url').toUpperCase()}"`,
      `"${(s.input || s.url || '').replace(/"/g, '""')}"`,
      `"${(s.verdict || 'Safe').toUpperCase()}"`,
      s.riskScore ?? s.risk_score ?? 0,
      `"${s.confidence || '95%'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkSentry_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice('Security audit CSV log downloaded successfully.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  const handleLaunchScanner = () => {
    if (onNavigateToScanner) {
      onNavigateToScanner('url');
    } else if (onSelectTab) {
      onSelectTab('scanner');
    }
  };

  return (
    <div className="page-container security-center-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">SECURITY OPERATIONS CENTER (SOC)</span>
          </div>
          <h1 className="page-main-heading">Security Center & Defense Posture</h1>
          <p className="page-subheading">
            Live multi-vector defense posture evaluation, active threat incident monitor, and actionable cybersecurity directives.
          </p>
        </div>

        {/* Global Security Posture Hero Card */}
        <div className="cyber-card soc-hero-card" style={{ marginBottom: '2rem' }}>
          <div className="soc-hero-content">
            <div className="soc-score-block">
              <span className="soc-score-label font-mono">WORKSPACE SECURITY DEFENSE RATING</span>
              <div className="soc-score-display" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
                <span className="soc-score-number font-mono" style={{ color: socData.scoreStatus.color }}>
                  {socData.calculatedScore}
                </span>
                <span className="soc-score-max font-mono">/ 100</span>
                <span className={`badge-pill ${socData.scoreStatus.badgeClass} soc-score-badge font-mono`}>
                  {socData.scoreStatus.label}
                </span>
              </div>
              <p className="soc-score-desc">
                {socData.totalScans === 0 ? (
                  <>
                    Baseline security posture ready for workspace <strong className="font-mono" style={{ color: 'var(--brand-cyan)' }}>{currentUser?.email || 'Authenticated Workspace User'}</strong>. Execute scans across link, QR, or message channels to establish your threat profile.
                  </>
                ) : (
                  <>
                    Real-time multi-signal defense evaluation derived from {socData.totalScans} investigation{socData.totalScans === 1 ? '' : 's'} across Link, QR, and SMS vectors for account{' '}
                    <strong className="font-mono" style={{ color: 'var(--brand-cyan)' }}>{currentUser?.email || 'Authenticated Workspace User'}</strong>.
                  </>
                )}
              </p>
            </div>

            <div className="soc-actions-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportAudit}
                disabled={scans.length === 0}
                data-testid="security-center-export-btn"
                title={scans.length === 0 ? 'No scans to export' : 'Export CSV log'}
              >
                📊 Export CSV Audit Log
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAuditModal(true)}
                data-testid="security-center-print-btn"
              >
                📄 Generate Security Audit Report
              </button>
            </div>
          </div>

          {exportNotice && (
            <div className="auth-error-alert animate-fade-in" style={{ marginTop: '1.25rem', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7' }}>
              <span className="error-icon">✓</span>
              <span>{exportNotice}</span>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="cyber-error-card" style={{ marginBottom: '1.5rem' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Standardized 4-Metric Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Total Scans Processed"
            value={socData.totalScans}
            icon="🛡️"
            subtitle={`${socData.totalScans} multi-vector audits`}
            badge="Telemetry"
            variant="cyan"
          />

          <StatCard
            title="Verified Clean Payloads"
            value={socData.safeScans}
            icon="✅"
            subtitle={`${socData.safePercentage}% benign ratio`}
            badge={socData.safePercentage >= 75 ? 'Optimal' : 'Caution'}
            variant="green"
          />

          <StatCard
            title="Suspicious Signals"
            value={socData.suspiciousScans}
            icon="⚠️"
            subtitle="Potential deceptive markers"
            badge="Caution"
            variant="amber"
          />

          <StatCard
            title="Critical Phishing Blocked"
            value={socData.phishingScans}
            icon="🚨"
            subtitle="High-severity hazards neutralized"
            badge="Phishing"
            variant="red"
          />
        </div>

        {/* 2-Column Middle Grid: Defense Sensors + Flagged Incidents Monitor */}
        <div className="dashboard-charts-grid" style={{ marginBottom: '2rem' }}>
          {/* Left: Defense Sensors & Controls */}
          <div className="cyber-card soc-panel-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Defense Infrastructure & Sensor Matrix</h3>
                <p className="card-subtitle">Real-time status of multi-vector detection and storage controls</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>
                4 Controls
              </span>
            </div>

            <div className="soc-sensors-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1.25rem' }}>
              {socData.defenseSensors.map((sensor) => (
                <div key={sensor.id} className="soc-sensor-item">
                  <div className="soc-sensor-icon">{sensor.icon}</div>
                  <div className="soc-sensor-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <strong className="soc-sensor-title">{sensor.title}</strong>
                      <Badge status={sensor.statusType === 'safe' ? 'Safe' : 'Info'} size="sm">
                        {sensor.status}
                      </Badge>
                    </div>
                    <p className="soc-sensor-desc">{sensor.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Active Flagged Incidents Quarantine Monitor */}
          <div className="cyber-card soc-panel-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Active Threat Incidents & Quarantine</h3>
                <p className="card-subtitle">Most recent suspicious and phishing targets flagged by detection engines</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem', color: socData.threatsDetected > 0 ? 'var(--status-phishing)' : 'var(--status-safe)' }}>
                {socData.threatsDetected} Incident{socData.threatsDetected === 1 ? '' : 's'}
              </span>
            </div>

            {socData.threatIncidents.length === 0 ? (
              <div className="soc-empty-incidents" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>🛡️</div>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--status-safe-text)', marginBottom: '0.35rem' }}>
                  Zero Active Threat Incidents
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 1rem', lineHeight: '1.45' }}>
                  No active phishing or suspicious payloads detected. Your workspace is currently in clean security standing.
                </p>
                {socData.totalScans === 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleLaunchScanner}
                  >
                    Launch Multi-Vector Scanner ➔
                  </button>
                )}
              </div>
            ) : (
              <div className="soc-incidents-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                {socData.threatIncidents.map((incident) => {
                  const itemVerdict = formatVerdict(incident.verdict);
                  const itemRisk = typeof incident.riskScore === 'number' ? incident.riskScore : (incident.risk_score || 0);
                  const itemTarget = incident.input || incident.url || 'Unknown target';
                  const itemDate = formatFirestoreTimestamp(incident.createdAt);
                  const itemType = (incident.type || 'url').toUpperCase();

                  return (
                    <div key={incident.id} className="soc-incident-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Badge status={itemVerdict} size="sm">
                            {itemVerdict} ({itemRisk}/100)
                          </Badge>
                          <span className="badge-chip font-mono" style={{ fontSize: '0.6875rem' }}>
                            {itemType === 'QR' ? '📷 QR' : itemType === 'MESSAGE' ? '💬 SMS' : '🌐 URL'}
                          </span>
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {itemDate}
                        </span>
                      </div>
                      <span className="soc-incident-target font-mono" title={itemTarget}>
                        {itemTarget}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actionable Defense Recommendations Card */}
        <div className="cyber-card soc-panel-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Actionable Defense Directives & Remediation</h3>
              <p className="card-subtitle">Context-aware security advisories based on your workspace telemetry</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>SOC Playbooks</span>
          </div>

          <div className="soc-recommendations-grid" style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="soc-rec-card">
              <div className="soc-rec-header">
                <span className="soc-rec-icon">🛡️</span>
                <strong>Phishing Lure Mitigation</strong>
              </div>
              <p className="soc-rec-body">
                {socData.phishingScans > 0
                  ? `${socData.phishingScans} high-risk phishing links were flagged. Ensure users avoid providing credentials and verify destination domains against official portals.`
                  : 'Zero phishing lures currently detected. Continue enforcing multi-factor authentication (MFA) on corporate accounts.'}
              </p>
            </div>

            <div className="soc-rec-card">
              <div className="soc-rec-header">
                <span className="soc-rec-icon">📷</span>
                <strong>Optical QR Code Hygiene</strong>
              </div>
              <p className="soc-rec-body">
                Physical and email-embedded QR codes frequently conceal URL redirects. Always scan QR barcodes through LinkSentry before authenticating.
              </p>
            </div>

            <div className="soc-rec-card">
              <div className="soc-rec-header">
                <span className="soc-rec-icon">💬</span>
                <strong>SMS Urgency Pressure Guard</strong>
              </div>
              <p className="soc-rec-body">
                Smishing attacks rely on artificial time pressure (bank alerts, package holds). Validate SMS claims through verified channels before clicking links.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Security Audit Report Modal */}
      {showAuditModal && (
        <SecurityAuditReportModal
          scans={scans}
          currentUser={currentUser}
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
}

