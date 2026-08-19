import { useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import ScanDetailModal from '../components/ScanDetailModal';
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

/**
 * Format time only for day-scan inspection list
 */
function formatTimeOnly(createdAt) {
  if (!createdAt) return '';
  try {
    let d;
    if (typeof createdAt.toDate === 'function') {
      d = createdAt.toDate();
    } else if (typeof createdAt.seconds === 'number') {
      d = new Date(createdAt.seconds * 1000);
    } else {
      d = new Date(createdAt);
    }
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  } catch {
    // Ignore
  }
  return '';
}

function formatVerdict(verdict) {
  if (!verdict) return 'Safe';
  const str = String(verdict).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function OverviewPage({ onNavigateToScanner, onSelectTab }) {
  const { scans, loading, error, refreshLocalScans } = useScans();
  const { currentUser } = useAuth();
  const { securityPreferences } = useTheme();
  const isCloudSyncOff = securityPreferences?.cloudSync === false;

  const [selectedScan, setSelectedScan] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(6); // Default to today (index 6)

  const handleRefresh = () => {
    refreshLocalScans();
  };

  // Telemetry Calculations strictly from real scan records
  const totalScans = scans.length;
  const safeScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
  const suspiciousScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'suspicious').length;
  const phishingScans = scans.filter((s) => (s.verdict || '').toLowerCase() === 'phishing').length;
  const threatsDetected = suspiciousScans + phishingScans;

  const safePercentage = totalScans === 0 ? 100 : Math.round((safeScans / totalScans) * 100);
  const suspiciousPercentage = totalScans === 0 ? 0 : Math.round((suspiciousScans / totalScans) * 100);
  const phishingPercentage = totalScans === 0 ? 0 : Math.round((phishingScans / totalScans) * 100);

  // Vector analysis
  const urlScans = scans.filter((s) => (s.type || 'url').toLowerCase() === 'url');
  const qrScans = scans.filter((s) => (s.type || '').toLowerCase() === 'qr');
  const messageScans = scans.filter((s) => (s.type || '').toLowerCase() === 'message');

  const urlCount = urlScans.length;
  const qrCount = qrScans.length;
  const messageCount = messageScans.length;

  const urlPercentage = totalScans === 0 ? 0 : Math.round((urlCount / totalScans) * 100);
  const qrPercentage = totalScans === 0 ? 0 : Math.round((qrCount / totalScans) * 100);
  const messagePercentage = totalScans === 0 ? 0 : Math.round((messageCount / totalScans) * 100);

  const urlThreats = urlScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
  const qrThreats = qrScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;
  const messageThreats = messageScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;

  const threatVectors = [
    {
      id: 'url',
      name: 'Link / URLs',
      icon: '🌐',
      count: urlCount,
      percentage: urlPercentage,
      threats: urlThreats,
      color: 'var(--brand-cyan)',
      accentBg: 'rgba(6, 182, 212, 0.12)'
    },
    {
      id: 'qr',
      name: 'QR Barcodes',
      icon: '📷',
      count: qrCount,
      percentage: qrPercentage,
      threats: qrThreats,
      color: '#8b5cf6',
      accentBg: 'rgba(139, 92, 246, 0.12)'
    },
    {
      id: 'message',
      name: 'SMS / Messages',
      icon: '💬',
      count: messageCount,
      percentage: messagePercentage,
      threats: messageThreats,
      color: '#ec4899',
      accentBg: 'rgba(236, 72, 153, 0.12)'
    },
  ];

  // LinkSentry Internal Posture Rating (composite multi-signal defense score)
  const avgRiskScore = totalScans === 0
    ? 0
    : Math.round(scans.reduce((acc, s) => acc + (typeof s.riskScore === 'number' ? s.riskScore : (s.risk_score || 0)), 0) / totalScans);

  const healthScore = totalScans === 0
    ? 100
    : Math.max(0, Math.min(100, 100 - avgRiskScore));

  const getPostureTier = (score) => {
    if (totalScans === 0) return { label: 'Baseline Ready', variant: 'cyan' };
    if (score >= 85) return { label: 'Optimal Defense', variant: 'green' };
    if (score >= 70) return { label: 'Good Posture', variant: 'cyan' };
    if (score >= 50) return { label: 'Elevated Risk', variant: 'amber' };
    return { label: 'Critical Hazard', variant: 'red' };
  };

  const postureTier = getPostureTier(healthScore);

  const highRiskAlerts = scans.filter((s) => {
    const risk = typeof s.riskScore === 'number' ? s.riskScore : (s.risk_score || 0);
    const verdict = (s.verdict || '').toLowerCase();
    return risk >= 70 || verdict === 'phishing';
  });

  // 7-day activity timeline grouping (last 7 calendar days)
  const activityByDay = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = i === 0 ? 'Today' : dayNames[d.getDay()];
      const monthName = monthNames[d.getMonth()];
      const dayNum = d.getDate();
      const shortDate = `${monthName} ${dayNum}`;
      const dayDateStr = d.toISOString().slice(0, 10);

      const dayScans = scans.filter((s) => {
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
      });

      const safeCount = dayScans.filter((s) => (s.verdict || '').toLowerCase() === 'safe').length;
      const threatCount = dayScans.filter((s) => (s.verdict || '').toLowerCase() !== 'safe').length;

      result.push({
        dayName,
        shortDate,
        dayNum,
        date: dayDateStr,
        count: dayScans.length,
        safeCount,
        threatCount,
        scans: dayScans
      });
    }
    return result;
  }, [scans]);

  const maxDayCount = Math.max(1, ...activityByDay.map((d) => d.count));
  const activeDay = activityByDay[selectedDayIndex] || activityByDay[activityByDay.length - 1];

  const quickScanners = [
    {
      type: 'url',
      icon: '🌐',
      title: 'URL Phishing Scanner',
      desc: 'Analyze suspicious links, brand lookalikes, homoglyphs, and zero-day phishing kits in real time.',
      badge: 'V3.4 Engine'
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

        {/* Live Telemetry Status Banner */}
        <div className="cyber-card auth-status-banner" style={{ marginBottom: '2rem' }}>
          <div className="status-icon-box">
            {loading ? '⏳' : isCloudSyncOff ? '📱' : error ? '⚠️' : '📊'}
          </div>
          <div className="status-text-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span
                className="cyber-badge-dot pulse"
                style={{
                  backgroundColor: loading
                    ? 'var(--brand-cyan)'
                    : isCloudSyncOff
                    ? 'var(--status-safe)'
                    : error
                    ? 'var(--status-phishing)'
                    : 'var(--status-safe)'
                }}
              />
              <strong className="status-title">
                {loading
                  ? 'Synchronizing Security Telemetry...'
                  : isCloudSyncOff
                  ? 'Local Device Storage Active (Cloud Sync Disabled)'
                  : error
                  ? 'Cloud Telemetry Offline (Local Vault Active)'
                  : currentUser
                  ? 'Real-Time Cloud Telemetry Synchronized'
                  : 'Local Audit Vault Active'}
              </strong>
            </div>
            <p className="status-body">
              {totalScans === 0
                ? 'No scans recorded yet. Use the scanners below to begin building your threat history.'
                : `${totalScans} verified scan record${totalScans === 1 ? '' : 's'} unified across your threat defense workspace.`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh dashboard telemetry"
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

        {/* 1. Primary Security KPI Grid */}
        <div className="grid grid-cols-4 dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <StatCard
            title="Total Investigations"
            value={totalScans}
            subtitle={totalScans > 0 ? `${totalScans} target payloads audited` : 'No scans yet'}
            icon="🛡️"
            variant="cyan"
            badge="Unified"
          />
          <StatCard
            title="Benign / Safe Ratio"
            value={`${safePercentage}%`}
            subtitle={totalScans > 0 ? `${safeScans} safe classifications` : '100% baseline'}
            icon="✅"
            variant="green"
            badge="Verified"
          />
          <StatCard
            title="Threats Flagged"
            value={threatsDetected}
            subtitle={`${phishingScans} phishing, ${suspiciousScans} suspicious`}
            icon="⚠️"
            variant="red"
            badge="Actioned"
          />
          <StatCard
            title="Defense Posture"
            value={`${healthScore}/100`}
            subtitle="LinkSentry Composite Index"
            icon="🔒"
            variant={postureTier.variant}
            badge={postureTier.label}
          />
        </div>

        {/* 2. 7-Day Activity Timeline (iPhone Battery Inspired) */}
        <div className="cyber-card activity-timeline-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">7-Day Scan Activity Timeline</h3>
              <p className="card-subtitle">Daily investigation volume with Safe vs. Threat distribution (Tap any day to inspect)</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>7-Day History</span>
          </div>

          {/* Battery-Style 7-Day Bar Grid */}
          <div className="battery-chart-container" role="group" aria-label="7-Day Activity Graph">
            {activityByDay.map((d, index) => {
              const isSelected = selectedDayIndex === index;
              const totalHeightPct = maxDayCount > 0 && d.count > 0
                ? Math.max(16, Math.round((d.count / maxDayCount) * 100))
                : 0;

              const safeHeightPct = d.count > 0 ? (d.safeCount / d.count) * totalHeightPct : 0;
              const threatHeightPct = d.count > 0 ? (d.threatCount / d.count) * totalHeightPct : 0;

              return (
                <button
                  key={d.date}
                  type="button"
                  className={`battery-day-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDayIndex(index)}
                  title={`${d.shortDate} (${d.dayName}): ${d.count} total scans (${d.safeCount} safe, ${d.threatCount} threats)`}
                  aria-pressed={isSelected}
                  data-testid={`activity-day-${index}`}
                >
                  <span className="battery-day-count-badge font-mono">{d.count}</span>

                  <div className="battery-bar-track">
                    {d.count === 0 ? (
                      <div className="battery-bar-empty-indicator" />
                    ) : (
                      <>
                        {safeHeightPct > 0 && (
                          <div
                            className="battery-bar-safe"
                            style={{ height: `${safeHeightPct}%` }}
                          />
                        )}
                        {threatHeightPct > 0 && (
                          <div
                            className="battery-bar-threat"
                            style={{ height: `${threatHeightPct}%` }}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="battery-day-info">
                    <span className="battery-day-name font-mono">{d.dayName}</span>
                    <span className="battery-day-date font-mono">{d.dayNum}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Drilldown Drawer */}
          {activeDay && (
            <div className="day-inspection-drawer animate-fade-in" data-testid="day-inspection-drawer">
              <div className="day-inspection-header">
                <div className="day-inspection-title font-mono">
                  📅 {activeDay.shortDate} ({activeDay.dayName}) Activity Details
                </div>
                <div className="day-inspection-stats font-mono">
                  <span className="day-stat-total">
                    {activeDay.count} Scan{activeDay.count === 1 ? '' : 's'}
                  </span>
                  <span className="day-stat-safe">
                    • {activeDay.safeCount} Safe
                  </span>
                  <span className={activeDay.threatCount > 0 ? 'day-stat-threat' : 'day-stat-muted'}>
                    • {activeDay.threatCount} Threat{activeDay.threatCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {activeDay.count === 0 ? (
                <p className="day-inspection-empty font-mono">
                  No security investigations recorded on this date.
                </p>
              ) : (
                <div className="day-inspection-scans-list">
                  {activeDay.scans.map((scanItem) => {
                    const itemVerdict = formatVerdict(scanItem.verdict);
                    const itemTarget = scanItem.input || scanItem.url || 'Unknown target';
                    const itemTime = formatTimeOnly(scanItem.createdAt);
                    const itemType = (scanItem.type || 'url').toUpperCase();

                    return (
                      <div
                        key={scanItem.id}
                        className="day-scan-item"
                        onClick={() => setSelectedScan(scanItem)}
                        role="button"
                        tabIndex={0}
                        title="Click to inspect full diagnostic telemetry"
                      >
                        <div className="day-scan-left">
                          <Badge status={itemVerdict} size="sm">{itemVerdict}</Badge>
                          <span className="day-scan-target font-mono" title={itemTarget}>
                            {itemTarget}
                          </span>
                        </div>
                        <div className="day-scan-right">
                          <span className="badge-chip font-mono">
                            {itemType === 'QR' ? '📷 QR' : itemType === 'MESSAGE' ? '💬 SMS' : '🌐 URL'}
                          </span>
                          {itemTime && <span className="day-scan-time font-mono">{itemTime}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Threat Vector Distribution & Classification Summary */}
        <div className="cyber-card overview-section-card" style={{ marginBottom: '2rem' }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Threat Vector Distribution</h3>
              <p className="card-subtitle">Attack surface breakdown and investigation volume across channels</p>
            </div>
            <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>3 Active Vectors</span>
          </div>

          {/* 3-Column Responsive Vector Cards Grid */}
          <div className="vector-cards-grid">
            {threatVectors.map((v) => (
              <div key={v.name} className="vector-card cyber-card-interactive" data-testid={`vector-card-${v.id}`}>
                <div className="vector-card-header">
                  <div className="vector-icon-badge" style={{ backgroundColor: v.accentBg, color: v.color }}>
                    {v.icon}
                  </div>
                  <div className="vector-card-title-group">
                    <h4 className="vector-card-title">{v.name}</h4>
                    <span className="vector-percentage-tag font-mono">{v.percentage}% of total scans</span>
                  </div>
                </div>

                <div className="vector-card-metrics">
                  <div className="vector-metric-main">
                    <span className="vector-metric-val font-mono">{v.count}</span>
                    <span className="vector-metric-label">scan{v.count === 1 ? '' : 's'}</span>
                  </div>

                  <div className="vector-threat-badge" style={{
                    backgroundColor: v.threats > 0 ? 'var(--status-phishing-bg)' : 'var(--status-safe-bg)',
                    borderColor: v.threats > 0 ? 'var(--status-phishing-border)' : 'var(--status-safe-border)',
                    color: v.threats > 0 ? 'var(--status-phishing-text)' : 'var(--status-safe-text)'
                  }}>
                    {v.threats > 0 ? `⚠️ ${v.threats} Threat${v.threats === 1 ? '' : 's'}` : '✓ 0 Threats'}
                  </div>
                </div>

                {/* Progress Track */}
                <div className="vector-progress-container">
                  <div className="vector-progress-track">
                    <div
                      className="vector-progress-fill"
                      style={{
                        width: `${totalScans === 0 ? 0 : Math.max(v.count > 0 ? 6 : 0, v.percentage)}%`,
                        backgroundColor: v.color
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Classification Summary Sub-Section */}
          <div className="classification-summary-box">
            <div className="classification-summary-header">
              <h4 className="classification-summary-title font-mono">CLASSIFICATION SUMMARY</h4>
              <span className="classification-summary-desc font-mono">Real-time verdict breakdown across all audited targets</span>
            </div>

            {/* Stacked Multi-Segment Classification Distribution Bar */}
            <div
              className="classification-bar-track"
              role="progressbar"
              aria-label="Threat Classification Split"
              title={`Safe: ${safePercentage}% (${safeScans}), Suspicious: ${suspiciousPercentage}% (${suspiciousScans}), Phishing: ${phishingPercentage}% (${phishingScans})`}
            >
              {totalScans === 0 ? (
                <div className="classification-bar-seg safe" style={{ width: '100%' }} />
              ) : (
                <>
                  {safePercentage > 0 && (
                    <div className="classification-bar-seg safe" style={{ width: `${safePercentage}%` }} />
                  )}
                  {suspiciousPercentage > 0 && (
                    <div className="classification-bar-seg suspicious" style={{ width: `${suspiciousPercentage}%` }} />
                  )}
                  {phishingPercentage > 0 && (
                    <div className="classification-bar-seg phishing" style={{ width: `${phishingPercentage}%` }} />
                  )}
                </>
              )}
            </div>

            {/* 3 Classification Metric Cards / Pills */}
            <div className="classification-pills-grid">
              <div className="classification-pill safe">
                <div className="classification-pill-dot safe" />
                <div className="classification-pill-info">
                  <span className="classification-pill-label font-mono">Safe & Clean</span>
                  <span className="classification-pill-value font-mono">
                    {safePercentage}% <span className="classification-pill-count">({safeScans} scan{safeScans === 1 ? '' : 's'})</span>
                  </span>
                </div>
              </div>

              <div className="classification-pill suspicious">
                <div className="classification-pill-dot suspicious" />
                <div className="classification-pill-info">
                  <span className="classification-pill-label font-mono">Suspicious Risk</span>
                  <span className="classification-pill-value font-mono">
                    {suspiciousPercentage}% <span className="classification-pill-count">({suspiciousScans} scan{suspiciousScans === 1 ? '' : 's'})</span>
                  </span>
                </div>
              </div>

              <div className="classification-pill phishing">
                <div className="classification-pill-dot phishing" />
                <div className="classification-pill-info">
                  <span className="classification-pill-label font-mono">Critical Phishing</span>
                  <span className="classification-pill-value font-mono">
                    {phishingPercentage}% <span className="classification-pill-count">({phishingScans} scan{phishingScans === 1 ? '' : 's'})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Quick Scanner Launchpads */}
        <div className="card-header-row" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 className="card-title">Detection Sensors & Scanners</h3>
            <p className="card-subtitle">Direct access to multi-signal threat investigation modules</p>
          </div>
        </div>
        <div className="overview-launchpad-grid" style={{ marginBottom: '2rem' }}>
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
                <span className="badge-tier font-mono" style={{ fontSize: '0.6875rem' }}>{item.badge}</span>
              </div>
              <h3 className="launchpad-title">{item.title}</h3>
              <p className="launchpad-desc">{item.desc}</p>
              <div className="launchpad-cta font-mono text-cyan">
                Launch Scanner ➔
              </div>
            </div>
          ))}
        </div>

        {/* 5. Recent Scans & Threat Signals Feed */}
        <div className="cyber-card dashboard-alerts-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Recent Scans & Threat Signals</h3>
              <p className="card-subtitle">Click any record to inspect complete diagnostic telemetry</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                {scans.length} Total Record{scans.length === 1 ? '' : 's'} ({highRiskAlerts.length} High-Risk)
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
                        Vector: {(scanItem.type || 'url').toUpperCase()} • Engine: {scanItem.engine || 'V3.4 ML'}
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
