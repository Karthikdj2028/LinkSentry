import { useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import SecurityAuditReportModal from '../components/SecurityAuditReportModal';
import { useScans, useAuth } from '../context';

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
 * Extract clean hostname from arbitrary target strings
 */
function extractHostname(input) {
  if (!input) return 'Unknown';
  try {
    const urlStr = input.startsWith('http://') || input.startsWith('https://')
      ? input
      : `https://${input}`;
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase().trim() || input.trim();
  } catch {
    return input.split('/')[0].toLowerCase().trim();
  }
}

/**
 * AnalyticsPage Component
 * Provides comprehensive security intelligence, threat posture grading,
 * vector threat exposure, targeted infrastructure correlation, and CSV / Executive Audit Report generation.
 */
export default function AnalyticsPage() {
  const { scans, error } = useScans();
  const { currentUser } = useAuth();
  const [exportNotice, setExportNotice] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Memoized Core Telemetry Calculations
  const metrics = useMemo(() => {
    const totalScans = scans.length;
    const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
    const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
    const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;
    const threatsDetected = suspiciousScans + phishingScans;

    const safePercentage = totalScans === 0 ? 100 : Math.round((safeScans / totalScans) * 100);
    const suspiciousPercentage = totalScans === 0 ? 0 : Math.round((suspiciousScans / totalScans) * 100);
    const phishingPercentage = totalScans === 0 ? 0 : Math.round((phishingScans / totalScans) * 100);
    const threatPercentage = totalScans === 0 ? 0 : Math.round((threatsDetected / totalScans) * 100);

    const avgRiskScore = totalScans === 0
      ? 0
      : Math.round(scans.reduce((acc, s) => acc + (s.riskScore || s.risk_score || 0), 0) / totalScans);

    // Multi-Vector Threat Exposure
    const urlScans = scans.filter((s) => (s.type || 'url').toLowerCase() === 'url');
    const qrScans = scans.filter((s) => (s.type || '').toLowerCase() === 'qr');
    const messageScans = scans.filter((s) => (s.type || '').toLowerCase() === 'message');

    const urlThreats = urlScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
    const qrThreats = qrScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
    const messageThreats = messageScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;

    const vectorBreakdown = [
      {
        id: 'url',
        name: 'Web URLs & Links',
        icon: '🌐',
        count: urlScans.length,
        percentage: totalScans === 0 ? 0 : Math.round((urlScans.length / totalScans) * 100),
        threats: urlThreats,
        clean: urlScans.length - urlThreats,
        threatRate: urlScans.length === 0 ? 0 : Math.round((urlThreats / urlScans.length) * 100),
        color: 'var(--brand-cyan)',
        accentBg: 'rgba(6, 182, 212, 0.12)'
      },
      {
        id: 'qr',
        name: 'QR Optical Barcodes',
        icon: '📷',
        count: qrScans.length,
        percentage: totalScans === 0 ? 0 : Math.round((qrScans.length / totalScans) * 100),
        threats: qrThreats,
        clean: qrScans.length - qrThreats,
        threatRate: qrScans.length === 0 ? 0 : Math.round((qrThreats / qrScans.length) * 100),
        color: '#8b5cf6',
        accentBg: 'rgba(139, 92, 246, 0.12)'
      },
      {
        id: 'message',
        name: 'SMS & Chat Messages',
        icon: '💬',
        count: messageScans.length,
        percentage: totalScans === 0 ? 0 : Math.round((messageScans.length / totalScans) * 100),
        threats: messageThreats,
        clean: messageScans.length - messageThreats,
        threatRate: messageScans.length === 0 ? 0 : Math.round((messageThreats / messageScans.length) * 100),
        color: '#ec4899',
        accentBg: 'rgba(236, 72, 153, 0.12)'
      }
    ];

    // Security Posture Grade
    const getPostureEvaluation = () => {
      if (totalScans === 0) {
        return {
          grade: 'N/A',
          label: 'Baseline Ready',
          color: '#64748b',
          summary: 'No investigations recorded. Execute scans across link, QR, or message channels to establish posture rating.'
        };
      }
      if (avgRiskScore <= 15) {
        return {
          grade: 'A+',
          label: 'Optimal Defense Posture',
          color: '#10b981',
          summary: 'Exceptional defense posture. The overwhelming majority of inspected artifacts are verified benign with low risk profile.'
        };
      }
      if (avgRiskScore <= 30) {
        return {
          grade: 'A',
          label: 'Robust Security Posture',
          color: '#06b6d4',
          summary: 'Solid defensive readiness. Threat signals are localized and effectively classified by multi-vector heuristics.'
        };
      }
      if (avgRiskScore <= 50) {
        return {
          grade: 'B',
          label: 'Moderate Threat Exposure',
          color: '#f59e0b',
          summary: 'Elevated threat activity detected. Exercise caution when interacting with unknown links or urgency-driven SMS lures.'
        };
      }
      if (avgRiskScore <= 70) {
        return {
          grade: 'C',
          label: 'High Threat Environment',
          color: '#f97316',
          summary: 'High density of malicious payloads observed. Multiple targeted social engineering patterns identified.'
        };
      }
      return {
        grade: 'F',
        label: 'Critical Threat Exposure',
        color: '#ef4444',
        summary: 'Severe threat concentration. Significant volume of active phishing or credential-harvesting targets encountered.'
      };
    };

    const posture = getPostureEvaluation();

    // Top Targeted Infrastructure Aggregation
    const domainMap = {};
    scans.forEach((scan) => {
      const rawTarget = scan.domain || scan.input || scan.url;
      const domain = extractHostname(rawTarget);

      if (domain && domain !== 'N/A' && domain !== 'Unknown') {
        if (!domainMap[domain]) {
          domainMap[domain] = {
            domain,
            total: 0,
            threats: 0,
            highestVerdict: 'Safe',
            vectors: new Set()
          };
        }

        domainMap[domain].total += 1;
        const v = (scan.verdict || 'safe').toLowerCase();
        if (v !== 'safe') {
          domainMap[domain].threats += 1;
          if (v === 'phishing') {
            domainMap[domain].highestVerdict = 'Phishing';
          } else if (v === 'suspicious' && domainMap[domain].highestVerdict !== 'Phishing') {
            domainMap[domain].highestVerdict = 'Suspicious';
          }
        }
        domainMap[domain].vectors.add((scan.type || 'url').toUpperCase());
      }
    });

    const topInfrastructure = Object.values(domainMap)
      .sort((a, b) => b.total - a.total || b.threats - a.threats)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        threatRate: item.total === 0 ? 0 : Math.round((item.threats / item.total) * 100),
        vectorList: Array.from(item.vectors).join(' / ')
      }));

    // 7-Day Velocity Trend
    const now = new Date();
    const trend7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayDateStr = d.toISOString().slice(0, 10);
      const dayName = i === 0 ? 'Today' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

      const dayScans = scans.filter((s) => {
        if (!s.createdAt) return false;
        let sDate;
        if (typeof s.createdAt.toDate === 'function') sDate = s.createdAt.toDate();
        else if (typeof s.createdAt.seconds === 'number') sDate = new Date(s.createdAt.seconds * 1000);
        else sDate = new Date(s.createdAt);
        return sDate && sDate.toISOString().slice(0, 10) === dayDateStr;
      });

      const daySafe = dayScans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
      const dayThreats = dayScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;

      trend7Days.push({
        dayName,
        date: dayDateStr,
        total: dayScans.length,
        safe: daySafe,
        threats: dayThreats
      });
    }

    return {
      totalScans,
      safeScans,
      suspiciousScans,
      phishingScans,
      threatsDetected,
      safePercentage,
      suspiciousPercentage,
      phishingPercentage,
      threatPercentage,
      avgRiskScore,
      vectorBreakdown,
      posture,
      topInfrastructure,
      trend7Days
    };
  }, [scans]);

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
      `"${s.engine || 'LinkSentry V3.4 ML'}"`
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

  return (
    <div className="page-container analytics-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">SECURITY INTELLIGENCE & TELEMETRY</span>
          </div>
          <h1 className="page-main-heading">Threat Analytics & Executive Reporting</h1>
          <p className="page-subheading">
            Multi-vector attack surface analysis, targeted infrastructure correlation, and publication-ready executive audit generation.
          </p>

          {/* Action Toolbar */}
          <div className="header-actions analytics-action-bar" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              disabled={scans.length === 0}
              data-testid="analytics-export-csv"
            >
              📊 Export CSV Telemetry
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAuditModal(true)}
              disabled={scans.length === 0}
              data-testid="analytics-print-report"
            >
              📄 Generate Security Audit Report
            </button>
          </div>
        </div>

        {/* Temporary Notice */}
        {exportNotice && (
          <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', marginBottom: '1.5rem' }}>
            <span className="error-icon">✓</span>
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="auth-error-alert" style={{ marginBottom: '1.5rem' }}>
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Primary KPI Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Total Investigations"
            value={metrics.totalScans}
            icon="🛡️"
            subtitle={`${metrics.totalScans} payloads analyzed`}
            badge="Unified"
            variant="cyan"
          />

          <StatCard
            title="Benign / Safe Ratio"
            value={`${metrics.safePercentage}%`}
            icon="✅"
            subtitle={`${metrics.safeScans} verified clean payloads`}
            badge={metrics.safePercentage >= 75 ? 'Optimal' : 'Caution'}
            variant="green"
          />

          <StatCard
            title="Threats Blocked"
            value={metrics.threatsDetected}
            icon="⚠️"
            subtitle={`${metrics.phishingScans} phishing • ${metrics.suspiciousScans} suspicious`}
            badge={`${metrics.threatPercentage}% Exposure`}
            variant="red"
          />

          <StatCard
            title="Average Threat Risk"
            value={`${metrics.avgRiskScore}/100`}
            icon="⚡"
            subtitle="Multi-signal composite score"
            badge="V3.4 Fusion"
            variant="amber"
          />
        </div>

        {/* 2. Middle Section: Security Posture Dossier & Attack Vector Exposure */}
        <div className="dashboard-charts-grid" style={{ marginBottom: '2rem' }}>
          {/* Left: Security Posture Dossier */}
          <div className="cyber-card analytics-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Security Defense Posture Dossier</h3>
                <p className="card-subtitle">Aggregated multi-signal readiness and threat exposure index</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>POSTURE INDEX</span>
            </div>

            <div className="posture-evaluation-container" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '1.25rem 0' }}>
              <div
                className="posture-grade-badge font-mono"
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.25rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  backgroundColor: metrics.posture.color,
                  boxShadow: `0 0 20px ${metrics.posture.color}55`,
                  flexShrink: 0
                }}
              >
                {metrics.posture.grade}
              </div>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: metrics.posture.color, marginBottom: '0.35rem' }}>
                  {metrics.posture.label} (Score: {metrics.totalScans === 0 ? '100' : Math.max(0, 100 - metrics.avgRiskScore)}/100)
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {metrics.totalScans === 0
                    ? 'No investigations recorded. Execute scans across link, QR, or message channels to establish baseline posture.'
                    : `Your workspace has audited ${metrics.totalScans} target payloads with an average risk level of ${metrics.avgRiskScore}/100. ${metrics.threatsDetected} threats (${metrics.phishingScans} phishing, ${metrics.suspiciousScans} suspicious) were flagged.`}
                </p>
              </div>
            </div>

            {/* Dynamic Telemetry Status Signals */}
            <div className="health-checklist" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>✓</span>
                <span>Active Telemetry Streams: <strong>{metrics.totalScans} Unified Record{metrics.totalScans === 1 ? '' : 's'}</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: metrics.threatsDetected > 0 ? 'var(--status-phishing)' : 'var(--status-safe)' }}>
                  {metrics.threatsDetected > 0 ? '⚠️' : '✓'}
                </span>
                <span>Threat Exposure Status: <strong>{metrics.threatsDetected > 0 ? `${metrics.threatsDetected} Flagged Threats (${metrics.threatPercentage}%)` : 'Zero Threats Detected'}</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>✓</span>
                <span>Multi-Vector Detection Engines: <strong>V3.4 Hybrid Inference Active</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Multi-Vector Threat Exposure */}
          <div className="cyber-card analytics-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Multi-Vector Threat Exposure</h3>
                <p className="card-subtitle">Volume breakdown and threat rates across attack surfaces</p>
              </div>
              <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>3 Channels</span>
            </div>

            <div className="analytics-vectors-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '1rem' }}>
              {metrics.vectorBreakdown.map((vec) => (
                <div key={vec.id} className="analytics-vector-item" data-testid={`analytics-vector-${vec.id}`}>
                  <div className="vector-info-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{vec.icon}</span>
                      <strong className="vector-name" style={{ fontSize: '0.875rem' }}>{vec.name}</strong>
                    </div>
                    <div className="vector-metrics-pill font-mono" style={{ fontSize: '0.75rem' }}>
                      <span>{vec.count} scans ({vec.percentage}%)</span>
                      <span style={{ margin: '0 0.35rem', color: 'var(--border-medium)' }}>•</span>
                      <span style={{ color: vec.threats > 0 ? 'var(--status-phishing-text)' : 'var(--status-safe-text)', fontWeight: 700 }}>
                        {vec.threats > 0 ? `${vec.threats} Threat${vec.threats === 1 ? '' : 's'} (${vec.threatRate}%)` : '0 Threats (0%)'}
                      </span>
                    </div>
                  </div>

                  <div className="vector-progress-track" style={{ height: '7px' }}>
                    <div
                      className="vector-progress-fill"
                      style={{
                        width: `${metrics.totalScans === 0 ? 0 : Math.max(vec.count > 0 ? 6 : 0, vec.percentage)}%`,
                        backgroundColor: vec.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 7-Day Velocity & Trend Summary */}
        <div className="cyber-card analytics-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">7-Day Threat Velocity & Volume Trend</h3>
              <p className="card-subtitle">Daily audit volume correlated with safe vs. threat detections</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>7-Day Trajectory</span>
          </div>

          <div className="analytics-trend-grid">
            {metrics.trend7Days.map((day) => (
              <div key={day.date} className="analytics-trend-col">
                <div className="analytics-trend-count font-mono">{day.total}</div>
                <div className="analytics-trend-bar-track">
                  {day.total > 0 ? (
                    <>
                      {day.safe > 0 && (
                        <div
                          className="analytics-trend-safe"
                          style={{ height: `${(day.safe / Math.max(1, day.total)) * 100}%` }}
                          title={`${day.safe} Safe Scans`}
                        />
                      )}
                      {day.threats > 0 && (
                        <div
                          className="analytics-trend-threat"
                          style={{ height: `${(day.threats / Math.max(1, day.total)) * 100}%` }}
                          title={`${day.threats} Threat Scans`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="analytics-trend-empty" />
                  )}
                </div>
                <div className="analytics-trend-day font-mono">{day.dayName}</div>
                <div className="analytics-trend-date font-mono">{day.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Top Targeted Hostnames & Infrastructure Table */}
        <div className="cyber-card analytics-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Top Targeted Hostnames & Threat Correlation</h3>
              <p className="card-subtitle">Most frequently inspected targets with observed attack vectors and risk classifications</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>
              {metrics.topInfrastructure.length} Targets
            </span>
          </div>

          {metrics.topInfrastructure.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p className="font-mono text-sm">No target hostname telemetry recorded yet.</p>
            </div>
          ) : (
            <div className="history-table-container" style={{ margin: '1rem 0 0' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Domain / Target Hostname</th>
                    <th>Invocations</th>
                    <th>Threats Flagged</th>
                    <th>Threat Exposure Rate</th>
                    <th>Observed Vectors</th>
                    <th style={{ textAlign: 'right' }}>Highest Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topInfrastructure.map((item) => (
                    <tr key={item.domain}>
                      <td className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {item.domain}
                      </td>
                      <td className="font-mono">
                        {item.total} audit{item.total > 1 ? 's' : ''}
                      </td>
                      <td className="font-mono" style={{ color: item.threats > 0 ? 'var(--status-phishing-text)' : 'inherit', fontWeight: item.threats > 0 ? '700' : 'normal' }}>
                        {item.threats}
                      </td>
                      <td className="font-mono">
                        <span style={{ color: item.threatRate > 50 ? 'var(--status-phishing-text)' : item.threatRate > 0 ? 'var(--status-suspicious-text)' : 'var(--status-safe-text)', fontWeight: '700' }}>
                          {item.threatRate}%
                        </span>
                      </td>
                      <td>
                        <span className="badge-chip font-mono" style={{ fontSize: '0.6875rem' }}>
                          {item.vectorList}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Badge status={item.highestVerdict} size="sm">
                          {item.highestVerdict}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Security Audit Report Modal */}
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

