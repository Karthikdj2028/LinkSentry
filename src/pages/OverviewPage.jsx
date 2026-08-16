import { useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import ScanDetailModal from '../components/ScanDetailModal';
import { useScans } from '../context';

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

export default function OverviewPage({ onNavigateToScanner, onSelectTab }) {
  const { scans, loading, error, refreshLocalScans } = useScans();
  const [selectedScan, setSelectedScan] = useState(null);

  const handleRefresh = () => {
    refreshLocalScans();
  };


  // Telemetry Calculations
  const totalScans = scans.length;
  const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
  const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
  const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;

  const safePercentage = totalScans === 0 ? 100 : Math.round((safeScans / totalScans) * 100);
  const suspiciousPercentage = totalScans === 0 ? 0 : Math.round((suspiciousScans / totalScans) * 100);
  const phishingPercentage = totalScans === 0 ? 0 : Math.round((phishingScans / totalScans) * 100);

  const urlCount = scans.filter((s) => (s.type || 'url').toLowerCase() === 'url').length;
  const qrCount = scans.filter((s) => (s.type || '').toLowerCase() === 'qr').length;
  const messageCount = scans.filter((s) => (s.type || '').toLowerCase() === 'message').length;

  const urlPercentage = totalScans === 0 ? 0 : Math.round((urlCount / totalScans) * 100);
  const qrPercentage = totalScans === 0 ? 0 : Math.round((qrCount / totalScans) * 100);
  const messagePercentage = totalScans === 0 ? 0 : Math.round((messageCount / totalScans) * 100);

  const threatVectors = [
    { name: 'Link / URLs', count: urlCount, percentage: urlPercentage, color: 'var(--brand-cyan)' },
    { name: 'QR Barcodes', count: qrCount, percentage: qrPercentage, color: '#8b5cf6' },
    { name: 'SMS / Messages', count: messageCount, percentage: messagePercentage, color: '#ec4899' },
  ];

  const healthScore = totalScans === 0
    ? 100
    : Math.round((safeScans / totalScans) * 100);

  const highRiskAlerts = scans.filter((s) => {
    const risk = typeof s.riskScore === 'number' ? s.riskScore : (s.risk_score || 0);
    const verdict = (s.verdict || '').toLowerCase();
    return risk >= 70 || verdict === 'phishing';
  });

  // 7-day activity timeline grouping
  const activityByDay = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dayDateStr = d.toISOString().slice(0, 10);

      const count = scans.filter((s) => {
        if (!s.createdAt) return false;
        let scanDate;
        if (typeof s.createdAt.toDate === 'function') {
          scanDate = s.createdAt.toDate();
        } else if (typeof s.createdAt.seconds === 'number') {
          scanDate = new Date(s.createdAt.seconds * 1000);
        } else {
          scanDate = new Date(s.createdAt);
        }
        return scanDate && scanDate.toISOString().slice(0, 10) === dayDateStr;
      }).length;

      result.push({ day: dayName, date: dayDateStr, count });
    }
    return result;
  }, [scans]);

  const maxDayCount = Math.max(1, ...activityByDay.map((d) => d.count));

  const quickScanners = [
    {
      type: 'url',
      icon: '🌐',
      title: 'URL Phishing Scanner',
      desc: 'Analyze suspicious links, brand lookalikes, homoglyphs, and zero-day phishing kits in real time.',
      badge: 'V3.3 Engine'
    },
    {
      type: 'qr',
      icon: '📷',
      title: 'QR Code Quishing Shield',
      desc: 'Decode optical barcodes from uploaded files or live camera feed, inspecting targets safely.',
      badge: 'Optical AI'
    },
    {
      type: 'message',
      icon: '💬',
      title: 'SMS & Smishing Analyzer',
      desc: 'Evaluate text messages, urgency pressure, banking lures, and fraudulent link embeds.',
      badge: 'Multi-Signal'
    }
  ];

  return (
    <div className="page-container overview-page animate-fade-in">
      <div className="container">
        {/* Page Hero Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">THREAT INTELLIGENCE & TELEMETRY</span>
          </div>
          <h1 className="page-main-heading">Security Overview</h1>
          <p className="page-subheading">
            Live telemetry, threat vector distribution, and proactive phishing defense across your web and mobile endpoints.
          </p>
        </div>

        {/* Quick Scanner Launchpads */}
        <div className="overview-launchpad-grid" style={{ marginBottom: '2.5rem' }}>
          {quickScanners.map((item) => (
            <div
              key={item.type}
              className="cyber-card cyber-card-interactive launchpad-card"
              onClick={() => onNavigateToScanner?.(item.type)}
              role="button"
              tabIndex={0}
              data-testid={`quick-launch-${item.type}`}
            >
              <div className="launchpad-card-header">
                <span className="launchpad-icon">{item.icon}</span>
                <span className="badge-tier" style={{ fontSize: '0.6875rem' }}>{item.badge}</span>
              </div>
              <h3 className="launchpad-title">{item.title}</h3>
              <p className="launchpad-desc">{item.desc}</p>
              <div className="launchpad-cta font-mono text-cyan">
                Launch Scanner ➔
              </div>
            </div>
          ))}
        </div>

        {/* Telemetry Status Banner */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">📊</div>
          <div className="status-text-group">
            <strong className="status-title">Live Security Telemetry Synchronized</strong>
            <p className="status-body">
              Aggregating threat telemetry across web and mobile endpoints ({scans.length} total scans recorded).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh dashboard stats"
            data-testid="overview-refresh-btn"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="cyber-error-card" style={{ marginBottom: '2rem' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* 4-Card Metric Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2.5rem' }}>
          <StatCard
            title="Total Scans"
            value={totalScans}
            subtitle={totalScans > 0 ? `${scans.length} verified targets` : 'No scans yet'}
            icon="🛡️"
            variant="cyan"
            badge="Unified"
          />
          <StatCard
            title="Safe Ratio"
            value={`${safePercentage}%`}
            subtitle={`${safeScans} safe classifications`}
            icon="✅"
            variant="green"
            badge="Verified"
          />
          <StatCard
            title="Threats Detected"
            value={phishingScans + suspiciousScans}
            subtitle={`${phishingScans} phishing, ${suspiciousScans} suspicious`}
            icon="⚠️"
            variant="red"
            badge="Actioned"
          />
          <StatCard
            title="Posture Rating"
            value={`${healthScore}/100`}
            subtitle={healthScore >= 80 ? 'Optimal Security Posture' : 'Review High Risk Alerts'}
            icon="🔒"
            variant="amber"
            badge="Live"
          />
        </div>

        {/* 2-Column Middle Grid: 7-Day Timeline & Threat Breakdown */}
        <div className="dashboard-charts-grid" style={{ marginBottom: '2.5rem' }}>
          {/* Left: 7-Day Timeline */}
          <div className="cyber-card timeline-chart-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">7-Day Scan Activity</h3>
                <p className="card-subtitle">Daily investigation volume from synchronized history</p>
              </div>
              <span className="badge-tier" style={{ fontSize: '0.6875rem' }}>Timeline</span>
            </div>

            {/* Bar Chart Visualization */}
            <div className="activity-chart-container">
              {activityByDay.map((d) => {
                const heightPercent = maxDayCount > 0 ? Math.round((d.count / maxDayCount) * 100) : 0;
                return (
                  <div key={d.date} className="chart-bar-col">
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${Math.max(8, heightPercent)}%` }}
                        title={`${d.date}: ${d.count} scans`}
                      />
                    </div>
                    <span className="chart-bar-count font-mono">{d.count}</span>
                    <span className="chart-bar-day font-mono">{d.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="health-checklist" style={{ marginTop: '1.25rem' }}>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>●</span>
                <span>Hybrid V3.3 Threat Engine: <strong>Active</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon" style={{ color: 'var(--status-safe)' }}>●</span>
                <span>Local + Cloud Persistent Vault: <strong>Ready</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Threat Vector Breakdown */}
          <div className="cyber-card vectors-card">
            <div className="card-header-row">
              <div>
                <h3 className="card-title">Threat Vector Distribution</h3>
                <p className="card-subtitle">Attack surface breakdown across link, QR, and SMS channels</p>
              </div>
            </div>

            <div className="vectors-breakdown-list">
              {threatVectors.map((v) => (
                <div key={v.name} className="vector-breakdown-item">
                  <div className="vector-info-row">
                    <span className="vector-name">{v.name}</span>
                    <span className="vector-count font-mono">{v.count} ({v.percentage}%)</span>
                  </div>
                  <div className="vector-progress-track">
                    <div
                      className="vector-progress-fill"
                      style={{
                        width: `${Math.max(4, v.percentage)}%`,
                        backgroundColor: v.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="verdict-distribution-box">
              <span className="distribution-label font-mono">CLASSIFICATION SUMMARY</span>
              <div className="verdict-mini-stats">
                <div className="verdict-mini-stat safe">
                  <span className="mini-val font-mono">{safePercentage}%</span>
                  <span className="mini-label">Safe</span>
                </div>
                <div className="verdict-mini-stat suspicious">
                  <span className="mini-val font-mono">{suspiciousPercentage}%</span>
                  <span className="mini-label">Suspicious</span>
                </div>
                <div className="verdict-mini-stat phishing">
                  <span className="mini-val font-mono">{phishingPercentage}%</span>
                  <span className="mini-label">Phishing</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Recent Alerts Feed */}
        <div className="cyber-card dashboard-alerts-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Recent Scans & Threat Signals</h3>
              <p className="card-subtitle">Click any record to inspect complete diagnostic telemetry</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                {scans.length} Total Records ({highRiskAlerts.length} High-Risk)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onSelectTab?.('history')}
                data-testid="overview-view-all-history-btn"
              >
                View Full History ➔
              </button>
            </div>
          </div>

          <div className="alerts-feed-list">
            {scans.length === 0 ? (
              <div className="cyber-empty-state" style={{ padding: '2rem 1rem' }}>
                <span className="empty-state-icon">🛡️</span>
                <p className="empty-state-desc">No scans recorded yet. Use any of the scanners above to inspect suspicious links, QR codes, or SMS text.</p>
              </div>
            ) : (
              scans.slice(0, 6).map((scanItem) => {
                const itemRisk = typeof scanItem.riskScore === 'number' ? scanItem.riskScore : (scanItem.risk_score || 0);
                const itemVerdict = formatVerdict(scanItem.verdict);
                const itemDate = formatFirestoreTimestamp(scanItem.createdAt);
                const itemTarget = scanItem.input || scanItem.url || 'Unknown artifact';

                return (
                  <div
                    key={scanItem.id}
                    className="alert-feed-item cyber-card-interactive"
                    onClick={() => setSelectedScan(scanItem)}
                    role="button"
                    tabIndex={0}
                    title="Click to view complete scan details"
                    data-testid={`overview-alert-item-${scanItem.id}`}
                  >
                    <div className="alert-feed-header">
                      <div className="alert-title-group">
                        <Badge status={itemVerdict} size="sm">
                          {itemVerdict} ({itemRisk}/100)
                        </Badge>
                        <span className="alert-item-title font-mono" title={itemTarget}>
                          {itemTarget}
                        </span>
                      </div>
                      <span className="alert-timestamp font-mono">{itemDate}</span>
                    </div>

                    <div className="alert-feed-body">
                      <span className="alert-vector-tag font-mono">
                        Vector: {(scanItem.type || 'url').toUpperCase()} • Engine: {scanItem.engine || 'V3.3 ML'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Interactive Scan Inspection Modal */}
      {selectedScan && (
        <ScanDetailModal
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </div>
  );
}
