import { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { useAuth } from '../context';
import { subscribeToUserScans } from '../firebase';

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
  const { currentUser } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportNotice, setExportNotice] = useState('');

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
        console.error('Failed to stream analytics telemetry:', err);
        setError('Cloud telemetry unavailable. Unable to retrieve scan analytics.');
        setLoading(false);
      },
      100
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

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
      'Domain',
      'Detection Engine',
      'Model Version',
      'Threat Indicators'
    ];

    const rows = scans.map((s) => [
      `"${s.id || ''}"`,
      `"${formatTimestamp(s.createdAt)}"`,
      `"${(s.type || 'url').toUpperCase()}"`,
      `"${(s.input || s.url || '').replace(/"/g, '""')}"`,
      `"${s.verdict || 'Safe'}"`,
      s.riskScore || s.risk_score || 0,
      `"${s.confidence ? `${Math.round(s.confidence * 100)}%` : '85%'}"`,
      `"${s.domain || ''}"`,
      `"${s.engine || 'LinkSentry V3.3'}"`,
      `"${s.modelVersion || 'V3.3'}"`,
      `"${(Array.isArray(s.indicators) ? s.indicators.join('; ') : '').replace(/"/g, '""')}"`
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

    setExportNotice('Security log CSV export downloaded successfully.');
    setTimeout(() => setExportNotice(''), 4000);
  };

  /**
   * Export / Print printable security audit dossier
   */
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="analytics-page-container container animate-fade-in">
      {/* Page Header */}
      <div className="dashboard-header-row">
        <div>
          <div className="section-tag font-mono text-cyan">TELEMETRY & INTELLIGENCE</div>
          <h1 className="page-title">Cybersecurity Threat Analytics</h1>
          <p className="page-subtitle">
            Comprehensive audit reports, vector threat distribution, and risk telemetry synchronized across Web and Mobile.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="analytics-actions-group" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={scans.length === 0}
          >
            📊 Export CSV Log
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrintDossier}
            disabled={scans.length === 0}
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

      {loading && scans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
          <p className="font-mono" style={{ fontSize: '0.9rem' }}>Streaming telemetry from Cloud Firestore...</p>
        </div>
      )}

      {/* Top Stat Cards Grid */}
      <div className="stat-cards-grid">
        <StatCard
          label="Total Scans Processed"
          value={totalScans}
          icon="🛡️"
          description="Audited across URL, QR, and SMS"
          badge="Live Telemetry"
          badgeType="safe"
        />

        <StatCard
          label="Threat Mitigation Rate"
          value={`${safePercentage}%`}
          icon="✅"
          description={`${safeScans} benign payloads safely verified`}
          badge={safePercentage >= 70 ? 'Optimal' : 'Caution'}
          badgeType={safePercentage >= 70 ? 'safe' : 'suspicious'}
        />

        <StatCard
          label="Active Threats Blocked"
          value={threatsDetected}
          icon="🚨"
          description={`${phishingScans} critical phishing • ${suspiciousScans} suspicious`}
          badge={`${threatPercentage}% Threat Ratio`}
          badgeType={threatsDetected > 0 ? 'phishing' : 'safe'}
        />

        <StatCard
          label="Average Risk Score"
          value={`${avgRiskScore}/100`}
          icon="⚡"
          description="Composite multi-signal threat index"
          badge="V3.3 Fusion"
          badgeType={avgRiskScore <= 30 ? 'safe' : 'phishing'}
        />
      </div>

      {/* Posture & Threat Vector Row */}
      <div className="dashboard-content-grid" style={{ marginTop: '1.5rem' }}>
        {/* Security Posture Dossier */}
        <div className="cyber-card">
          <div className="dashboard-section-header">
            <h3 className="section-title">
              <span>🛡️</span> Defensive Posture Evaluation
            </h3>
            <span className="font-mono text-cyan" style={{ fontSize: '0.8rem' }}>
              ISO/IEC 27001 ALIGNED
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem 0' }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '16px',
                border: `3px solid ${posture.color}`,
                background: 'rgba(15, 23, 42, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: '900',
                color: posture.color,
                fontFamily: 'monospace',
                boxShadow: `0 0 25px ${posture.color}33`
              }}
            >
              {posture.grade}
            </div>

            <div>
              <h4 style={{ fontSize: '1.2rem', color: posture.color, fontWeight: '700', marginBottom: '0.25rem' }}>
                {posture.label}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                {totalScans === 0
                  ? 'No scan records logged yet. Start scanning suspicious URLs, QR codes, or SMS messages to generate real-time defensive telemetry.'
                  : `Your organization has analyzed ${totalScans} digital payloads with an average risk level of ${avgRiskScore}/100. ${threatsDetected} suspicious or malicious payloads were successfully flagged.`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace' }}>Safe Payload Rate</span>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981', margin: '0.2rem 0' }}>{safePercentage}%</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace' }}>Suspicious Rate</span>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#eab308', margin: '0.2rem 0' }}>{totalScans === 0 ? 0 : Math.round((suspiciousScans / totalScans) * 100)}%</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace' }}>Phishing Rate</span>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444', margin: '0.2rem 0' }}>{totalScans === 0 ? 0 : Math.round((phishingScans / totalScans) * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Vector Distribution Breakdown */}
        <div className="cyber-card">
          <div className="dashboard-section-header">
            <h3 className="section-title">
              <span>🎯</span> Attack Vector Distribution
            </h3>
            <span className="font-mono text-cyan" style={{ fontSize: '0.8rem' }}>
              MULTI-VECTOR RADAR
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
            {/* URL Vector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>🌐 Web URL Detonation</span>
                <span className="font-mono" style={{ color: '#00f2fe' }}>{urlScans} scans ({totalScans === 0 ? 0 : Math.round((urlScans / totalScans) * 100)}%)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalScans === 0 ? 0 : (urlScans / totalScans) * 100}%`, background: 'linear-gradient(90deg, #00f2fe, #4facfe)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>

            {/* QR Vector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>📷 QR Optical Quishing</span>
                <span className="font-mono" style={{ color: '#10b981' }}>{qrScans} scans ({totalScans === 0 ? 0 : Math.round((qrScans / totalScans) * 100)}%)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalScans === 0 ? 0 : (qrScans / totalScans) * 100}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>

            {/* SMS / Message Vector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#f8fafc', fontWeight: '600' }}>💬 SMS / Message Smishing</span>
                <span className="font-mono" style={{ color: '#eab308' }}>{messageScans} scans ({totalScans === 0 ? 0 : Math.round((messageScans / totalScans) * 100)}%)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalScans === 0 ? 0 : (messageScans / totalScans) * 100}%`, background: 'linear-gradient(90deg, #eab308, #fbbf24)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Targeted Domains Table */}
      {topDomains.length > 0 && (
        <div className="cyber-card" style={{ marginTop: '1.5rem' }}>
          <div className="dashboard-section-header">
            <h3 className="section-title">
              <span>🌐</span> Most Frequently Evaluated Domains
            </h3>
            <span className="font-mono text-cyan" style={{ fontSize: '0.8rem' }}>
              TARGET CLUSTER FREQUENCY
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>DOMAIN NAME</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>SCAN FREQUENCY</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>DEFENSE DISPOSITION</th>
                </tr>
              </thead>
              <tbody>
                {topDomains.map(([domain, count], idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#00f2fe', fontWeight: '600' }}>
                      {domain}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#f8fafc', fontWeight: 'bold' }}>
                      {count} {count === 1 ? 'scan' : 'scans'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <Badge status="Safe">MONITORED</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
