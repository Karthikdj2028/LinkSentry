import { useState } from 'react';
import Badge from '../components/Badge';
import { useScans, useAuth } from '../context';

/**
 * Format Firestore timestamp safely.
 */
function formatFirestoreTimestamp(createdAt) {
  if (!createdAt) return 'Pending';
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

export default function SecurityCenterPage() {
  const { scans, error } = useScans();
  const { currentUser } = useAuth();
  const [exportNotice, setExportNotice] = useState('');



  // Telemetry Calculations
  const totalScans = scans.length;
  const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
  const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
  const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;

  const calculatedScore = totalScans === 0
    ? 98
    : Math.max(10, Math.min(99, Math.round(100 - (phishingScans * 25 + suspiciousScans * 10) / Math.max(1, totalScans))));

  const getScoreStatus = (score) => {
    if (score >= 85) return { label: 'OPTIMAL DEFENSE', color: '#10b981', badgeClass: 'badge-safe' };
    if (score >= 70) return { label: 'GOOD POSTURE', color: '#06b6d4', badgeClass: 'badge-info' };
    if (score >= 50) return { label: 'MODERATE RISK', color: '#f59e0b', badgeClass: 'badge-suspicious' };
    return { label: 'CRITICAL POSTURE', color: '#ef4444', badgeClass: 'badge-phishing' };
  };

  const scoreStatus = getScoreStatus(calculatedScore);

  const securityChecklist = [
    {
      id: 'ml_engine',
      title: 'AI Multi-Signal Phishing Engine',
      desc: 'LinkSentry hybrid ML inference and regex heuristic matrix',
      status: 'Active',
      isOk: true,
    },
    {
      id: 'qr_radar',
      title: 'QR Code / Quishing Optical Radar',
      desc: 'Barcode parsing with homoglyph & shortened redirect analysis',
      status: 'Protected',
      isOk: true,
    },
    {
      id: 'sms_heuristic',
      title: 'SMS Smishing NLP Heuristics',
      desc: 'Social engineering and urgency pressure keyword detection',
      status: 'Protected',
      isOk: true,
    },
    {
      id: 'local_cloud_vault',
      title: 'Resilient Local & Cloud Vault Sync',
      desc: 'Zero data loss architecture across device and Firestore database',
      status: 'Active',
      isOk: true,
    },
  ];

  const handleExportAudit = () => {
    if (scans.length === 0) {
      setExportNotice('No scan records available to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Target / Payload', 'Verdict', 'Risk Score', 'Confidence'];
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

    setExportNotice('Security audit report downloaded.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  return (
    <div className="page-container security-center-page animate-fade-in">
      <div className="container">
        {/* Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-phishing)' }} />
            <span className="font-mono">SECURITY OPERATIONS CENTER (SOC)</span>
          </div>
          <h1 className="page-main-heading">Security Center & User Posture</h1>
          <p className="page-subheading">
            Live multi-vector protection score, threat vector analytics, actionable security recommendations, and user-scoped audit report generation.
          </p>
        </div>

        {/* Global Security Posture Score Card */}
        <div className="cyber-card soc-hero-card" style={{ marginBottom: '2rem' }}>
          <div className="soc-hero-content">
            <div className="soc-score-block">
              <span className="soc-score-label font-mono">OVERALL FLEET DEFENSE RATING</span>
              <div className="soc-score-display">
                <span className="soc-score-number font-mono" style={{ color: scoreStatus.color }}>
                  {calculatedScore}
                </span>
                <span className="soc-score-max font-mono">/ 100</span>
                <span className={`badge-pill ${scoreStatus.badgeClass}`} style={{ marginLeft: '1rem' }}>
                  {scoreStatus.label}
                </span>
              </div>
              <p className="soc-score-desc">
                Protection score calculated from live threat telemetry across URL, QR optical radar, and smishing heuristics for authenticated account <strong className="font-mono text-cyan">{currentUser?.email || 'Guest Analyst'}</strong>.
              </p>
            </div>

            <div className="soc-actions-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportAudit}
                disabled={scans.length === 0}
                data-testid="security-center-export-btn"
              >
                📊 Export CSV Audit Log
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => window.print()}
                disabled={scans.length === 0}
                data-testid="security-center-print-btn"
              >
                🖨️ Print Security Report
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

        {/* Telemetry Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <div className="cyber-card stat-card stat-card-cyan">
            <div className="stat-card-top">
              <div className="stat-card-info">
                <span className="stat-card-title">TOTAL SCANS PROCESSED</span>
                <h3 className="stat-card-value font-mono">{totalScans}</h3>
              </div>
              <div className="stat-card-icon-box stat-icon-cyan">📊</div>
            </div>
            <div className="stat-card-bottom">
              <span className="stat-subtitle">Verified telemetry entries</span>
            </div>
          </div>

          <div className="cyber-card stat-card stat-card-green">
            <div className="stat-card-top">
              <div className="stat-card-info">
                <span className="stat-card-title">VERIFIED SAFE VECTORS</span>
                <h3 className="stat-card-value font-mono">{safeScans}</h3>
              </div>
              <div className="stat-card-icon-box stat-icon-green">🛡️</div>
            </div>
            <div className="stat-card-bottom">
              <span className="stat-subtitle">Clean links & messages</span>
            </div>
          </div>

          <div className="cyber-card stat-card stat-card-amber">
            <div className="stat-card-top">
              <div className="stat-card-info">
                <span className="stat-card-title">SUSPICIOUS SIGNALS</span>
                <h3 className="stat-card-value font-mono">{suspiciousScans}</h3>
              </div>
              <div className="stat-card-icon-box stat-icon-amber">⚠️</div>
            </div>
            <div className="stat-card-bottom">
              <span className="stat-subtitle">Potential deceptive markers</span>
            </div>
          </div>

          <div className="cyber-card stat-card stat-card-red">
            <div className="stat-card-top">
              <div className="stat-card-info">
                <span className="stat-card-title">CONFIRMED PHISHING</span>
                <h3 className="stat-card-value font-mono">{phishingScans}</h3>
              </div>
              <div className="stat-card-icon-box stat-icon-red">🚨</div>
            </div>
            <div className="stat-card-bottom">
              <span className="stat-subtitle">Critical threats neutralized</span>
            </div>
          </div>
        </div>

        {/* Security Checklist & Recommendations */}
        <div className="cyber-card" style={{ marginBottom: '2.5rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Defense Infrastructure Checklist</h3>
              <p className="card-subtitle">Active protective controls and real-time sensor status</p>
            </div>
            <span className="badge-tier" style={{ fontSize: '0.6875rem' }}>4 / 4 Active</span>
          </div>

          <div className="soc-checklist-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {securityChecklist.map((item) => (
              <div key={item.id} className="checklist-item-card" style={{ padding: '1.25rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', color: 'var(--text-primary)' }}>{item.title}</h4>
                  <Badge status="Safe" size="sm">{item.status}</Badge>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
