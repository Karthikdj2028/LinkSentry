import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { MOCK_DASHBOARD_STATS } from '../data/mockData';

/**
 * DashboardPage Component
 * Displays cybersecurity statistics, telemetry, and threat feeds
 * 
 * TODO: In Stage 2, aggregate statistics using Firebase Cloud Functions & Firestore count() queries
 */
export default function DashboardPage({ onNavigateToScanner }) {
  const stats = MOCK_DASHBOARD_STATS;

  return (
    <div className="page-container dashboard-page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#06b6d4' }} />
            <span className="font-mono text-cyan">SECURITY OPERATIONS CENTER (SOC) INTELLIGENCE</span>
          </div>
          <h1 className="page-main-heading">Phishing Telemetry & Dashboard</h1>
          <p className="page-subheading">
            Live telemetry and detection rates across all LinkSentry scanners and defense endpoints.
          </p>
        </div>

        {/* 4 Primary Metric Stat Cards */}
        <div className="grid grid-cols-4 dashboard-stats-grid">
          <StatCard
            title="Total Scans Executed"
            value={stats.totalScans.toLocaleString()}
            subtitle="Combined URL, QR & SMS queries"
            variant="cyan"
            icon="🛡️"
            trend={{ isPositive: true, text: "+14.2% this week" }}
          />

          <StatCard
            title="Safe Scans"
            value={stats.safeScans.toLocaleString()}
            subtitle="Verified clean targets"
            variant="green"
            icon="✅"
            badge="76.7%"
            trend={{ isPositive: true, text: "Normal baseline" }}
          />

          <StatCard
            title="Suspicious Threats"
            value={stats.suspiciousScans.toLocaleString()}
            subtitle="Anomalies flagged for caution"
            variant="amber"
            icon="⚠️"
            badge="14.4%"
            trend={{ isPositive: false, text: "+3.1% surge" }}
          />

          <StatCard
            title="Phishing Blocked"
            value={stats.phishingScans.toLocaleString()}
            subtitle="Confirmed malicious attacks"
            variant="red"
            icon="🚫"
            badge="8.9%"
            trend={{ isPositive: false, text: "Critical intercept" }}
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
              <span className="font-mono text-cyan text-sm">TELEMETRY: STAGE 1 MOCK</span>
            </div>

            <div className="vector-bars-list">
              {stats.threatVectors.map((vector) => (
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
                <span className="meta-label">Avg Inspection Latency:</span>
                <span className="meta-val font-mono text-cyan">{stats.avgResponseMs} ms</span>
              </div>
              <div className="meta-pill">
                <span className="meta-label">Active Threat Signatures:</span>
                <span className="meta-val font-mono text-purple">{stats.activeThreatSignatures.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Right: Security Posture Health Box */}
          <div className="cyber-card dashboard-health-card">
            <h3 className="card-title">LinkSentry Defense Health</h3>
            <p className="card-subtitle">Heuristic and signature engine operational integrity</p>

            <div className="health-score-dial">
              <div className="health-dial-circle">
                <span className="health-dial-number font-mono">{stats.defenseEfficiencyRate}</span>
                <span className="health-dial-label">Interception Rate</span>
              </div>
            </div>

            <div className="health-checklist">
              <div className="health-check-row">
                <span className="check-icon text-green">●</span>
                <span>URL Detonation Sandbox: <strong>ONLINE</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon text-green">●</span>
                <span>QR Optical Matrix Parser: <strong>ONLINE</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon text-green">●</span>
                <span>NLP Smishing Classifier: <strong>ONLINE</strong></span>
              </div>
              <div className="health-check-row">
                <span className="check-icon text-amber">●</span>
                <span>Cloud Firestore Sync: <strong>STAGE 2 STANDBY</strong></span>
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
              <p className="card-subtitle">Live intercepted campaigns flagged across the network</p>
            </div>
            <span className="font-mono text-red text-sm">CRITICAL FEED</span>
          </div>

          <div className="alerts-feed-list">
            {stats.recentAlerts.map((alert) => (
              <div key={alert.id} className="alert-feed-item">
                <div className="alert-feed-header">
                  <div className="alert-title-group">
                    <Badge status={alert.severity} size="sm">
                      {alert.severity}
                    </Badge>
                    <span className="alert-item-title">{alert.title}</span>
                  </div>
                  <span className="alert-timestamp font-mono">{alert.timestamp}</span>
                </div>
                <p className="alert-details-text">{alert.details}</p>
                <div className="alert-vector-tag font-mono">
                  Vector: <strong>{alert.vector}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-todo-notice font-mono">
            // TODO: In Stage 2, connect Firebase Cloud Messaging (FCM) for real-time push alerts to desktop & Android
          </div>
        </div>
      </div>
    </div>
  );
}
