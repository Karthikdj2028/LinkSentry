import { useState, useMemo, useEffect } from 'react';
import Badge from './Badge';

/**
 * Format timestamp safely for report generation
 */
function formatReportTimestamp(date = new Date()) {
  try {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return new Date().toISOString();
  }
}

/**
 * SecurityAuditReportModal Component
 * Renders a comprehensive, publication-grade Executive Security Audit Report
 * computed 100% from authentic user scan telemetry. Supports on-screen Dark/Light viewing
 * and clean PDF/Paper printing via window.print().
 */
export default function SecurityAuditReportModal({ scans = [], currentUser, onClose }) {
  const [reportId] = useState(() => {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LS-AUDIT-${d}-${rand}`;
  });

  const generatedDate = useMemo(() => formatReportTimestamp(new Date()), []);

  // Telemetry Calculations
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

  // Vector Breakdown
  const urlScans = scans.filter((s) => (s.type || 'url').toLowerCase() === 'url');
  const qrScans = scans.filter((s) => (s.type || '').toLowerCase() === 'qr');
  const messageScans = scans.filter((s) => (s.type || '').toLowerCase() === 'message');

  const urlThreats = urlScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
  const qrThreats = qrScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
  const messageThreats = messageScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;

  const vectorStats = [
    {
      name: 'Web URLs & Links',
      icon: '🌐',
      total: urlScans.length,
      threats: urlThreats,
      clean: urlScans.length - urlThreats,
      threatRate: urlScans.length === 0 ? 0 : Math.round((urlThreats / urlScans.length) * 100)
    },
    {
      name: 'QR Optical Barcodes',
      icon: '📷',
      total: qrScans.length,
      threats: qrThreats,
      clean: qrScans.length - qrThreats,
      threatRate: qrScans.length === 0 ? 0 : Math.round((qrThreats / qrScans.length) * 100)
    },
    {
      name: 'SMS & Messages',
      icon: '💬',
      total: messageScans.length,
      threats: messageThreats,
      clean: messageScans.length - messageThreats,
      threatRate: messageScans.length === 0 ? 0 : Math.round((messageThreats / messageScans.length) * 100)
    }
  ];

  // Posture Evaluation
  const getPostureEvaluation = () => {
    if (totalScans === 0) {
      return { grade: 'N/A', label: 'Baseline Ready', color: '#64748b', summary: 'No scan records available to evaluate defense posture. Begin auditing URLs, QR codes, or SMS text to establish baseline security profile.' };
    }
    if (avgRiskScore <= 15) {
      return { grade: 'A+', label: 'Optimal Defense Posture', color: '#10b981', summary: 'Exceptional defense posture with minimal threat exposure. The vast majority of audited artifacts are benign with verified infrastructure.' };
    }
    if (avgRiskScore <= 30) {
      return { grade: 'A', label: 'Robust Defense Posture', color: '#06b6d4', summary: 'Strong security posture. Threats encountered are localized and effectively categorized with multi-signal heuristics.' };
    }
    if (avgRiskScore <= 50) {
      return { grade: 'B', label: 'Moderate Threat Exposure', color: '#f59e0b', summary: 'Elevated threat exposure detected across audited vectors. Heightened vigilance recommended for link and message vectors.' };
    }
    if (avgRiskScore <= 70) {
      return { grade: 'C', label: 'High Threat Environment', color: '#f97316', summary: 'High frequency of suspicious or malicious artifacts observed. Multiple targeted social engineering patterns detected.' };
    }
    return { grade: 'F', label: 'Critical Threat Hazard', color: '#ef4444', summary: 'Severe threat concentration. Significant volume of zero-day phishing kits or credential harvesting lures flagged in user investigations.' };
  };

  const posture = getPostureEvaluation();

  // Top Targeted Infrastructure Aggregation
  const domainMap = {};
  scans.forEach((scan) => {
    let domain = scan.domain;
    if (!domain && scan.input) {
      try {
        const urlStr = scan.input.startsWith('http') ? scan.input : `https://${scan.input}`;
        domain = new URL(urlStr).hostname;
      } catch {
        // Fallback
        domain = scan.input.split('/')[0];
      }
    }
    if (domain && domain !== 'N/A' && domain !== 'Unknown') {
      const cleanDomain = domain.toLowerCase().trim();
      if (!domainMap[cleanDomain]) {
        domainMap[cleanDomain] = {
          domain: cleanDomain,
          total: 0,
          threats: 0,
          highestVerdict: 'Safe',
          vectors: new Set()
        };
      }
      domainMap[cleanDomain].total += 1;
      const v = (scan.verdict || 'safe').toLowerCase();
      if (v !== 'safe') {
        domainMap[cleanDomain].threats += 1;
        if (v === 'phishing') {
          domainMap[cleanDomain].highestVerdict = 'Phishing';
        } else if (v === 'suspicious' && domainMap[cleanDomain].highestVerdict !== 'Phishing') {
          domainMap[cleanDomain].highestVerdict = 'Suspicious';
        }
      }
      domainMap[cleanDomain].vectors.add((scan.type || 'url').toUpperCase());
    }
  });

  const topInfrastructure = Object.values(domainMap)
    .sort((a, b) => b.total - a.total || b.threats - a.threats)
    .slice(0, 5);

  // Fast, lightweight print handler
  const handlePrint = () => {
    document.body.classList.add('is-printing-audit-report');
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('is-printing-audit-report');
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('is-printing-audit-report');
    };
  }, []);

  return (
    <div
      className="modal-overlay animate-fade-in audit-report-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card audit-report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Toolbar (Screen only, hidden in print) */}
        <div className="audit-modal-toolbar screen-only">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="modal-icon">📄</span>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.05rem' }}>Executive Security Audit Report</h3>
              <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{reportId}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              data-testid="audit-modal-print-btn"
            >
              🖨️ Print / Save as PDF
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close report modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Formal Audit Report Document */}
        <div className="audit-report-document printable-audit-report">
          {/* Document Header */}
          <div className="report-doc-header">
            <div className="report-brand-group">
              <div className="report-logo font-mono">
                LINK<span style={{ color: 'var(--brand-cyan)' }}>SENTRY</span>
              </div>
              <span className="report-doc-tagline font-mono">EXECUTIVE CYBERSECURITY INTELLIGENCE AUDIT</span>
            </div>
            <div className="report-meta-box font-mono">
              <div><strong>Report ID:</strong> {reportId}</div>
              <div><strong>Generated:</strong> {generatedDate}</div>
              <div><strong>Scope:</strong> {currentUser?.email || 'Authenticated Workspace User'}</div>
              <div><strong>Classification:</strong> RESTRICTED / CLIENT AUDIT</div>
            </div>
          </div>

          <hr className="report-divider" />

          {/* Section 1: Executive Summary & Security Posture */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">1. EXECUTIVE SUMMARY & POSTURE EVALUATION</h4>
            <div className="report-posture-card">
              <div className="report-posture-grade font-mono" style={{ backgroundColor: posture.color }}>
                {posture.grade}
              </div>
              <div className="report-posture-details">
                <div className="report-posture-heading" style={{ color: posture.color }}>
                  {posture.label} (Composite Score: {totalScans === 0 ? '100' : Math.max(0, 100 - avgRiskScore)}/100)
                </div>
                <p className="report-posture-desc">
                  {posture.summary}
                </p>
                <div className="report-posture-sub font-mono">
                  Analysis based on {totalScans} target investigations with an average threat risk index of {avgRiskScore}/100.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Key Telemetry Metrics */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">2. CORE TELEMETRY METRICS</h4>
            <div className="report-metrics-grid">
              <div className="report-metric-box">
                <span className="report-metric-label">Total Audits</span>
                <span className="report-metric-value font-mono">{totalScans}</span>
                <span className="report-metric-sub">Multi-vector payload targets</span>
              </div>
              <div className="report-metric-box">
                <span className="report-metric-label">Benign / Safe Ratio</span>
                <span className="report-metric-value font-mono" style={{ color: 'var(--status-safe)' }}>
                  {safePercentage}%
                </span>
                <span className="report-metric-sub">{safeScans} verified clean payloads</span>
              </div>
              <div className="report-metric-box">
                <span className="report-metric-label">Threats Blocked</span>
                <span className="report-metric-value font-mono" style={{ color: threatsDetected > 0 ? 'var(--status-phishing)' : 'var(--text-primary)' }}>
                  {threatsDetected}
                </span>
                <span className="report-metric-sub">{phishingScans} phishing • {suspiciousScans} suspicious</span>
              </div>
              <div className="report-metric-box">
                <span className="report-metric-label">Threat Exposure Rate</span>
                <span className="report-metric-value font-mono" style={{ color: threatPercentage > 20 ? 'var(--status-phishing)' : 'var(--status-suspicious)' }}>
                  {threatPercentage}%
                </span>
                <span className="report-metric-sub">Overall risk concentration</span>
              </div>
            </div>
          </div>

          {/* Section 3: Attack Vector Breakdown */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">3. MULTI-VECTOR ATTACK SURFACE ANALYSIS</h4>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Attack Vector</th>
                  <th>Total Audited</th>
                  <th>Clean Payloads</th>
                  <th>Threats Flagged</th>
                  <th style={{ textAlign: 'right' }}>Vector Threat Rate</th>
                </tr>
              </thead>
              <tbody>
                {vectorStats.map((vec) => (
                  <tr key={vec.name}>
                    <td>
                      <strong>{vec.icon} {vec.name}</strong>
                    </td>
                    <td className="font-mono">{vec.total}</td>
                    <td className="font-mono" style={{ color: 'var(--status-safe)' }}>{vec.clean}</td>
                    <td className="font-mono" style={{ color: vec.threats > 0 ? 'var(--status-phishing)' : 'inherit' }}>
                      {vec.threats}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {vec.threatRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Classification Distribution */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">4. VERDICT CLASSIFICATION DISTRIBUTION</h4>
            <div className="report-classification-pills">
              <div className="report-class-pill safe">
                <span className="report-class-dot safe" />
                <div>
                  <strong>Clean / Benign:</strong> {safeScans} scans ({safePercentage}%)
                </div>
              </div>
              <div className="report-class-pill suspicious">
                <span className="report-class-dot suspicious" />
                <div>
                  <strong>Suspicious Risk:</strong> {suspiciousScans} scans ({suspiciousPercentage}%)
                </div>
              </div>
              <div className="report-class-pill phishing">
                <span className="report-class-dot phishing" />
                <div>
                  <strong>Critical Phishing:</strong> {phishingScans} scans ({phishingPercentage}%)
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Top Targeted Infrastructure */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">5. TOP TARGETED HOSTNAMES & INFRASTRUCTURE</h4>
            {topInfrastructure.length === 0 ? (
              <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                No hostname telemetry recorded in this reporting period.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Domain / Hostname</th>
                    <th>Invocations</th>
                    <th>Threats Detected</th>
                    <th>Observed Vectors</th>
                    <th style={{ textAlign: 'right' }}>Risk Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {topInfrastructure.map((item) => (
                    <tr key={item.domain}>
                      <td className="font-mono font-bold">{item.domain}</td>
                      <td className="font-mono">{item.total}</td>
                      <td className="font-mono" style={{ color: item.threats > 0 ? 'var(--status-phishing)' : 'inherit' }}>
                        {item.threats}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                        {Array.from(item.vectors).join(', ')}
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
            )}
          </div>

          {/* Section 6: Actionable Security Recommendations */}
          <div className="report-section">
            <h4 className="report-section-title font-mono">6. ACTIONABLE DEFENSE RECOMMENDATIONS</h4>
            <div className="report-recommendations-list">
              <div className="report-rec-item">
                <span className="report-rec-icon">🔹</span>
                <div>
                  <strong>Credential Harvesting Mitigation:</strong> For all URLs flagged as Phishing or Suspicious, ensure immediate multi-factor authentication (MFA) enforcement across relevant corporate accounts.
                </div>
              </div>
              <div className="report-rec-item">
                <span className="report-rec-icon">🔹</span>
                <div>
                  <strong>Quishing Awareness & Camera Safety:</strong> Optical QR codes can bypass standard email gateway link parsers. Always preview decoded URLs before authenticating or granting permissions.
                </div>
              </div>
              <div className="report-rec-item">
                <span className="report-rec-icon">🔹</span>
                <div>
                  <strong>SMS Urgency Pressure Filtering:</strong> Unsolicited messages demanding urgent banking, package delivery, or credential verification should be audited through LinkSentry heuristics prior to clicking links.
                </div>
              </div>
            </div>
          </div>

          {/* Document Footer & Disclaimer */}
          <div className="report-doc-footer font-mono">
            <div className="report-disclaimer">
              <strong>DISCLAIMER:</strong> This security audit report is generated automatically by LinkSentry based on client telemetry and multi-signal machine learning heuristic analysis. Posture evaluations and risk scores represent LinkSentry internal analytical metrics.
            </div>
            <div className="report-doc-signoff">
              <span>LinkSentry Threat Intelligence Platform V3.3</span>
              <span>Page 1 of 1 • End of Audit Report</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="modal-footer screen-only">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
