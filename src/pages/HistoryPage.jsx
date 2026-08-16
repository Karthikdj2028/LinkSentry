import { useState } from 'react';
import Badge from '../components/Badge';
import ScanDetailModal from '../components/ScanDetailModal';
import { useScans, useTheme } from '../context';

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

export default function HistoryPage() {
  const { scans, loading, error, refreshLocalScans, removeScan } = useScans();
  const { securityPreferences } = useTheme();
  const isCloudSyncOff = securityPreferences?.cloudSync === false;


  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleRefresh = () => {
    refreshLocalScans();
  };

  const handleDeleteScan = async (e, scanId) => {
    e?.stopPropagation();
    if (!scanId) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this scan record?');
    if (!confirmDelete) return;

    try {
      setDeletingId(scanId);
      await removeScan(scanId);

      if (selectedRecord?.id === scanId) {
        setSelectedRecord(null);
      }
    } catch (delErr) {
      console.error('Failed to delete scan record:', delErr);
      alert('Failed to delete scan record.');
    } finally {
      setDeletingId(null);
    }
  };


  // Filter chips definition
  const filterChips = [
    { id: 'ALL', label: 'All Scans' },
    { id: 'PHISHING', label: 'Phishing' },
    { id: 'SUSPICIOUS', label: 'Suspicious' },
    { id: 'SAFE', label: 'Safe' },
    { id: 'URL', label: 'Links' },
    { id: 'QR', label: 'QR Codes' },
    { id: 'MESSAGE', label: 'Messages' },
  ];

  // Filtering records
  const filteredRecords = scans.filter((item) => {
    const scanInput = item.input || item.url || '';
    const scanDomain = item.domain || '';
    const scanType = (item.type || 'url').toUpperCase();
    const scanVerdict = (item.verdict || 'safe').toUpperCase();

    const matchesSearch =
      scanInput.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanDomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanVerdict.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'SAFE' || activeFilter === 'SUSPICIOUS' || activeFilter === 'PHISHING') {
      return scanVerdict === activeFilter;
    }
    if (activeFilter === 'URL' || activeFilter === 'QR' || activeFilter === 'MESSAGE') {
      return scanType === activeFilter;
    }

    return true;
  });

  return (
    <div className="page-container history-page animate-fade-in">
      <div className="container">
        {/* Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">SECURITY LOGS</span>
          </div>
          <h1 className="page-main-heading">Scan History & Activity</h1>
          <p className="page-subheading">
            Review previous threat assessments, investigation records, and security classifications synchronized with your account.
          </p>
        </div>

        {/* Sync Status Banner */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">{isCloudSyncOff ? '📱' : '🗄️'}</div>
          <div className="status-text-group">
            <strong className="status-title">
              {isCloudSyncOff ? 'Local Device Storage Active' : 'Cloud Audit Logs Synchronized'}
            </strong>
            <p className="status-body">
              {isCloudSyncOff ? (
                <span>
                  <strong>Cloud sync is off</strong> — scans remain stored privately on this device ({scans.length} records).
                </span>
              ) : (
                <span>
                  {scans.length} scan records stored securely in your private history.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleRefresh}
            disabled={loading}
            title="Reload latest records"
            data-testid="history-refresh-btn"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Logs'}
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="cyber-card history-controls-card">
          {/* Full-width Search Input */}
          <div className="history-search-row">
            <div className="search-box-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input search-input font-mono"
                placeholder="Search history by URL, domain, or verdict..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading && scans.length === 0}
                data-testid="history-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => setSearchTerm('')}
                  data-testid="history-search-clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips Bar */}
          <div className="history-filter-chips-row" role="tablist" aria-label="Filter Scans by Category">
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`filter-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveFilter(chip.id)}
                  data-testid={`filter-chip-${chip.id.toLowerCase()}`}
                  role="tab"
                  aria-selected={isActive}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="cyber-error-card" style={{ marginBottom: '1.5rem' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* History Results View */}
        {loading && scans.length === 0 ? (
          <div className="cyber-card cyber-empty-state">
            <div className="empty-state-icon">⏳</div>
            <h3 className="empty-state-title">Loading Security Records...</h3>
            <p className="empty-state-desc">Synchronizing scan audit telemetry.</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="cyber-card cyber-empty-state" data-testid="history-empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">No Scan Records Found</h3>
            <p className="empty-state-desc">
              {searchTerm
                ? `No scans matching query "${searchTerm}". Try a different search term or filter.`
                : activeFilter !== 'ALL'
                ? `No scans found under category "${activeFilter}".`
                : 'You have not scanned any targets yet. Run a URL, QR, or Message scan to start building your audit trail.'}
            </p>
          </div>
        ) : (
          <div className="history-table-container cyber-card">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Verdict</th>
                  <th>Target / Payload</th>
                  <th>Vector</th>
                  <th>Engine / Model</th>
                  <th>Scanned Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const itemRisk = typeof item.riskScore === 'number' ? item.riskScore : (item.risk_score || 0);
                  const itemVerdict = formatVerdict(item.verdict);
                  const itemDate = formatFirestoreTimestamp(item.createdAt);
                  const itemTarget = item.input || item.url || 'Unknown target';
                  const itemType = (item.type || 'url').toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      className="history-row-interactive"
                      onClick={() => setSelectedRecord(item)}
                      data-testid={`history-row-${item.id}`}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Badge status={itemVerdict} size="sm">
                            {itemVerdict} ({itemRisk}/100)
                          </Badge>
                          {item.isLocalOnly && (
                            <span className="badge-tier" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }} title="Stored locally on this device">
                              Local
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="target-cell">
                        <span className="target-text font-mono" title={itemTarget}>
                          {itemTarget}
                        </span>
                      </td>
                      <td>
                        <span className="badge-chip font-mono">
                          {itemType === 'QR' ? '📷 QR' : itemType === 'MESSAGE' ? '💬 SMS' : '🌐 URL'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                          {item.engine || 'V3.3 ML'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {itemDate}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions-group" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedRecord(item)}
                            title="Inspect complete telemetry"
                            data-testid={`view-detail-${item.id}`}
                          >
                            🔍 Inspect
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-delete-row"
                            onClick={(e) => handleDeleteScan(e, item.id)}
                            disabled={deletingId === item.id}
                            title="Delete this record"
                            data-testid={`delete-scan-${item.id}`}
                          >
                            {deletingId === item.id ? '...' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Diagnostic Inspection Modal */}
      {selectedRecord && (
        <ScanDetailModal
          scan={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
