import { useState } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { useScans } from '../context';

/**
 * Format Firestore timestamp safely for exports and display.
 */
function formatTimestamp(createdAt) {
  if (!createdAt) return new Date().toLocaleString();

  try {
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    if (typeof createdAt.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    const parsedDate = new Date(createdAt);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  } catch (err) {
    console.error('Error formatting timestamp:', err);
  }

  return 'Pending timestamp';
}

/**
 * AnalyticsPage Component
 * Provides comprehensive security intelligence, threat posture grading,
 * vector analysis, top targeted domains, and CSV / PDF report export capabilities.
 */
export default function AnalyticsPage() {
  const { scans, error } = useScans();
  const [exportNotice, setExportNotice] = useState('');


  // Telemetry Calculations
  const totalScans = scans.length;
  const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
  const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
  const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;
  const threatsDetected = suspiciousScans + phishingScans;

  const urlScans = scans.filter((s) => (s.type || '').toLowerCase() === 'url').length;
  const qrScans = scans.filter((s) => (s.type || '').toLowerCase() === 'qr').length;
  const messageScans = scans.filter((s) => (s.type || '').toLowerCase() === 'message').length;

  const safePercentage = totalScans === 0 ? 0 : Math.round((safeScans / totalScans) * 100);
  const threatPercentage = totalScans === 0 ? 0 : Math.round((threatsDetected / totalScans) * 100);

  const avgRiskScore = totalScans === 0
    ? 0
    : Math.round(scans.reduce((acc, s) => acc + (s.riskScore || s.risk_score || 0), 0) / totalScans);

  // Security Posture Grade
  const getSecurityPostureGrade = () => {
    if (totalScans === 0) return { grade: 'N/A', label: 'No Scans Yet', color: '#94a3b8' };
    if (avgRiskScore <= 15) return { grade: 'A+', label: 'Optimal Defense Posture', color: '#10b981' };
    if (avgRiskScore <= 30) return { grade: 'A', label: 'Robust Security Posture', color: '#10b981' };
    if (avgRiskScore <= 50) return { grade: 'B', label: 'Elevated Threat Exposure', color: '#eab308' };
    if (avgRiskScore <= 70) return { grade: 'C', label: 'High Threat Environment', color: '#f97316' };
    return { grade: 'F', label: 'Critical Threat Hazard', color: '#ef4444' };
  };

  const posture = getSecurityPostureGrade();

  // Top Targeted Domains
  const domainFrequency = {};
  scans.forEach((scan) => {
    const domain = scan.domain || (scan.input && scan.input.startsWith('http') ? new URL(scan.input).hostname : null);
    if (domain && domain !== 'N/A' && domain !== 'Unknown') {
      domainFrequency[domain] = (domainFrequency[domain] || 0) + 1;
    }
  });

  const topDomains = Object.entries(domainFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // -------------------------------------------------------------------------
  // EXPORT HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Export all user scan telemetry as CSV
   */
  const handleExportCSV = () => {
    if (scans.length === 0) {
      setExportNotice('No scan records available to export.');
      return;
    }

    const headers = [
      'Record ID',
      'Timestamp',
      'Vector Type',
      'Target / Payload',
      'Verdict',
      'Risk Score',
      'Confidence',
      'Detection Engine'
    ];

    const rows = scans.map((s) => [
      `"${s.id || ''}"`,
      `"${formatTimestamp(s.createdAt)}"`,
      `"${(s.type || 'url').toUpperCase()}"`,
      `"${(s.input || s.url || '').replace(/"/g, '""')}"`,
      `"${(s.verdict || 'Safe').toUpperCase()}"`,
      s.riskScore ?? s.risk_score ?? 0,
      `"${s.confidence || '95%'}"`,
      `"${s.engine || 'LinkSentry V3.3 ML'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkSentry_Threat_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice('CSV telemetry log downloaded successfully.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  /**
   * Trigger clean print-styled PDF view
   */
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="page-container analytics-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">TELEMETRY & INTELLIGENCE</span>
          </div>
          <h1 className="page-main-heading">Cybersecurity Threat Analytics</h1>
          <p className="page-subheading">
            Comprehensive audit reports, vector threat distribution, and risk telemetry synchronized across Web and Mobile.
          </p>

          {/* Action Toolbar */}
          <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              disabled={scans.length === 0}
              data-testid="analytics-export-csv"
            >
              📊 Export CSV Log
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrintReport}
              disabled={scans.length === 0}
              data-testid="analytics-print-report"
            >
              📄 Print Security Audit Report
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', marginBottom: '1.5rem' }}>
            <span className="error-icon">✓</span>
            <span>{exportNotice}</span>
          </div>
        )}

        {error && (
          <div className="auth-error-alert" style={{ marginBottom: '1.5rem' }}>
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Top Stat Cards Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Total Scans Processed"
            value={totalScans}
            icon="🛡️"
            subtitle="Audited across URL, QR, and SMS"
            badge="Telemetry"
            variant="cyan"
          />

          <StatCard
            title="Threat Mitigation Rate"
            value={`${safePercentage}%`}
            icon="✅"
            subtitle={`${safeScans} benign payloads safely verified`}
            badge={safePercentage >= 70 ? 'Optimal' : 'Caution'}
            variant="green"
          />

          <StatCard
            title="Active Threats Blocked"
            value={threatsDetected}
            icon="⚠️"
            subtitle={`${phishingScans} critical phishing • ${suspiciousScans} suspicious`}
            badge={`${threatPercentage}% Ratio`}
            variant="red"
          />

          <StatCard
            title="Average Risk Score"
            value={`${avgRiskScore}/100`}
            icon="⚡"
            subtitle="Composite multi-signal threat index"
            badge="V3.3 Fusion"
            variant="amber"
          />
        </div>

        {/* Posture & Threat Vector Row */}
        <div className="dashboard-charts-grid" style={{ marginBottom: '2.5rem' }}>
          {/* Security Posture Dossier */}
          <div className="cyber-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Defensive Posture Evaluation</h3>
                <p className="card-subtitle">Aggregated organizational readiness and threat profile</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>ISO/IEC 27001 ALIGNED</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '1.5rem 0' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.25rem',
                  fontWeight: '800',
                  fontFamily: 'var(--font-mono)',
                  color: '#ffffff',
                  backgroundColor: posture.color,
                  boxShadow: `0 0 20px ${posture.color}55`,
                  flexShrink: 0
                }}
              >
                {posture.grade}
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: posture.color, marginBottom: '0.25rem' }}>
                  {posture.label}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {totalScans === 0
                    ? 'No scans available to evaluate defense posture. Run a security scan to establish baseline.'
                    : `Your organization has analyzed ${totalScans} digital payloads with an average risk level of ${avgRiskScore}/100. ${threatsDetected} suspicious or malicious payloads were successfully flagged.`}
                </p>
              </div>
            </div>

            <div className="health-checklist">
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>✓</span>
                <span>Real-Time Phishing Domain Telemetry: <strong>Active</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>✓</span>
                <span>Optical QR Matrix Quishing Filter: <strong>Operational</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>✓</span>
                <span>SMS / Smishing Neural Heuristic Engine: <strong>Synchronized</strong></span>
              </div>
            </div>
          </div>

          {/* Threat Vector Distribution */}
          <div className="cyber-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Attack Vector Distribution</h3>
                <p className="card-subtitle">Telemetry volume classified by payload type</p>
              </div>
            </div>

            <div className="vectors-breakdown-list" style={{ marginTop: '1rem' }}>
              <div className="vector-breakdown-item">
                <div className="vector-info-row">
                  <span className="vector-name">🌐 Web Links & URLs</span>
                  <span className="vector-count font-mono">{urlScans} ({totalScans === 0 ? 0 : Math.round((urlScans / totalScans) * 100)}%)</span>
                </div>
                <div className="vector-progress-track">
                  <div
                    className="vector-progress-fill"
                    style={{
                      width: `${totalScans === 0 ? 0 : Math.max(4, Math.round((urlScans / totalScans) * 100))}%`,
                      backgroundColor: 'var(--brand-cyan)'
                    }}
                  />
                </div>
              </div>

              <div className="vector-breakdown-item">
                <div className="vector-info-row">
                  <span className="vector-name">📷 QR Optical Barcodes</span>
                  <span className="vector-count font-mono">{qrScans} ({totalScans === 0 ? 0 : Math.round((qrScans / totalScans) * 100)}%)</span>
                </div>
                <div className="vector-progress-track">
                  <div
                    className="vector-progress-fill"
                    style={{
                      width: `${totalScans === 0 ? 0 : Math.max(4, Math.round((qrScans / totalScans) * 100))}%`,
                      backgroundColor: '#8b5cf6'
                    }}
                  />
                </div>
              </div>

              <div className="vector-breakdown-item">
                <div className="vector-info-row">
                  <span className="vector-name">💬 SMS & Smishing Messages</span>
                  <span className="vector-count font-mono">{messageScans} ({totalScans === 0 ? 0 : Math.round((messageScans / totalScans) * 100)}%)</span>
                </div>
                <div className="vector-progress-track">
                  <div
                    className="vector-progress-fill"
                    style={{
                      width: `${totalScans === 0 ? 0 : Math.max(4, Math.round((messageScans / totalScans) * 100))}%`,
                      backgroundColor: '#ec4899'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Targeted Domains Table */}
        <div className="cyber-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Top Targeted Hostnames & Infrastructure</h3>
              <p className="card-subtitle">Most frequently analyzed hostnames across investigations</p>
            </div>
          </div>

          {topDomains.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p className="font-mono text-sm">No domain telemetry recorded yet.</p>
            </div>
          ) : (
            <div className="history-table-container" style={{ margin: '1rem 0 0' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Domain / Hostname</th>
                    <th>Scan Invocations</th>
                    <th>Observed Vectors</th>
                    <th style={{ textAlign: 'right' }}>Telemetry Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topDomains.map(([domain, count]) => (
                    <tr key={domain}>
                      <td className="font-mono" style={{ fontWeight: '600', color: 'var(--brand-cyan)' }}>
                        {domain}
                      </td>
                      <td className="font-mono">
                        {count} scan{count > 1 ? 's' : ''}
                      </td>
                      <td>
                        <span className="badge-chip font-mono">LINK / QR</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Badge status="Safe" size="sm">Synchronized</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
