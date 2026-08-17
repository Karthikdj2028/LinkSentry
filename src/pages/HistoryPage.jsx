import { useState, useMemo } from 'react';
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

/**
 * Extract millisecond timestamp safely for numeric sorting
 */
function getTimestampMs(createdAt) {
  if (!createdAt) return 0;
  try {
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().getTime();
    }
    if (typeof createdAt.seconds === 'number') {
      return createdAt.seconds * 1000;
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  } catch {
    // Ignore
  }
  return 0;
}

function formatVerdict(verdict) {
  if (!verdict) return 'Safe';
  const str = String(verdict).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function HistoryPage({ onSelectTab, onNavigateToScanner }) {
  const { scans, loading, error, refreshLocalScans, removeScan } = useScans();
  const { securityPreferences } = useTheme();
  const isCloudSyncOff = securityPreferences?.cloudSync === false;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleRefresh = () => {
    refreshLocalScans();
  };

  const handleLaunchScanner = () => {
    if (onNavigateToScanner) {
      onNavigateToScanner('url');
    } else if (onSelectTab) {
      onSelectTab('scanner');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActiveFilter('ALL');
    setSortBy('NEWEST');
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

  // Memoized Filtering and Sorting over unified scan records
  const filteredAndSortedRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = scans.filter((item) => {
      const scanInput = item.input || item.url || '';
      const scanDomain = item.domain || '';
      const scanType = (item.type || 'url').toUpperCase();
      const scanVerdict = (item.verdict || 'safe').toUpperCase();

      const matchesSearch =
        !q ||
        scanInput.toLowerCase().includes(q) ||
        scanDomain.toLowerCase().includes(q) ||
        scanType.toLowerCase().includes(q) ||
        scanVerdict.toLowerCase().includes(q);

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

    // Shallow copy before sorting to avoid mutating state
    return [...filtered].sort((a, b) => {
      const riskA = typeof a.riskScore === 'number' ? a.riskScore : (a.risk_score || 0);
      const riskB = typeof b.riskScore === 'number' ? b.riskScore : (b.risk_score || 0);
      const timeA = getTimestampMs(a.createdAt);
      const timeB = getTimestampMs(b.createdAt);

      switch (sortBy) {
        case 'HIGHEST_RISK':
          return riskB - riskA || timeB - timeA;
        case 'LOWEST_RISK':
          return riskA - riskB || timeB - timeA;
        case 'OLDEST':
          return timeA - timeB;
        case 'NEWEST':
        default:
          return timeB - timeA;
      }
    });
  }, [scans, searchTerm, activeFilter, sortBy]);

  const hasActiveFilter = searchTerm.trim() !== '' || activeFilter !== 'ALL' || sortBy !== 'NEWEST';

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
        <div className="cyber-card auth-status-banner" style={{ marginBottom: '2rem' }}>
          <div className="status-icon-box">{isCloudSyncOff ? '📱' : '🗄️'}</div>
          <div className="status-text-group">
            <strong className="status-title">
              {isCloudSyncOff ? 'Local Device Storage Active' : 'Cloud Audit Logs Synchronized'}
            </strong>
            <p className="status-body">
              {isCloudSyncOff ? (
                <span>
                  <strong>Cloud sync is off</strong> — scans remain stored privately on this device ({scans.length} record{scans.length === 1 ? '' : 's'}).
                </span>
              ) : (
                <span>
                  {scans.length} scan record{scans.length === 1 ? '' : 's'} stored securely in your private history.
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

        {/* Search, Sort & Filter Controls Card */}
        <div className="cyber-card history-controls-card" style={{ marginBottom: '2rem' }}>
          {/* Search + Sort Controls Bar */}
          <div className="history-search-sort-row">
            <div className="search-box-wrapper history-search-wrapper">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="form-input search-input font-mono"
                placeholder="Search history by URL, domain, type, or verdict..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading && scans.length === 0}
                aria-label="Search History"
                data-testid="history-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => setSearchTerm('')}
                  title="Clear search query"
                  aria-label="Clear search"
                  data-testid="history-search-clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="history-sort-wrapper">
              <label htmlFor="history-sort-select" className="history-sort-label font-mono">
                Sort:
              </label>
              <select
                id="history-sort-select"
                className="form-select history-sort-select font-mono"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                data-testid="history-sort-select"
                aria-label="Sort scan records"
              >
                <option value="NEWEST">Newest First</option>
                <option value="HIGHEST_RISK">Highest Risk First</option>
                <option value="LOWEST_RISK">Lowest Risk First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Filter Chips Bar (Horizontally scrollable on mobile) */}
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

          {/* Results Count & Filter Summary Row */}
          <div className="history-results-summary">
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing {filteredAndSortedRecords.length} of {scans.length} record{scans.length === 1 ? '' : 's'}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearFilters}
                data-testid="history-clear-all-filters-btn"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                Reset Filters
              </button>
            )}
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
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="cyber-card cyber-empty-state" data-testid="history-empty-state">
            <div className="empty-state-icon">{scans.length === 0 ? '🛡️' : '🔍'}</div>
            <h3 className="empty-state-title">
              {scans.length === 0 ? 'No Scans Recorded Yet' : 'No Matching Scan Records'}
            </h3>
            <p className="empty-state-desc" style={{ maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              {scans.length === 0
                ? 'You have not scanned any targets yet. Run a URL, QR code, or Message scan to start building your unified security audit trail.'
                : searchTerm
                ? `No scans matching query "${searchTerm}". Try a different search term or reset your filters.`
                : `No scans found under category "${activeFilter}".`}
            </p>

            {scans.length === 0 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLaunchScanner}
                data-testid="history-empty-launch-scanner-btn"
              >
                Launch Threat Scanner ➔
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearFilters}
                data-testid="history-empty-reset-filters-btn"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Data Table (Hidden on small mobile screens) */}
            <div className="history-table-container cyber-card history-desktop-view">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Verdict & Risk</th>
                    <th>Target / Payload</th>
                    <th>Vector</th>
                    <th>Engine</th>
                    <th>Scanned Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedRecords.map((item) => {
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
                              aria-label="Delete scan record"
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

            {/* Mobile Cards List (Visible on mobile viewports < 768px) */}
            <div className="history-mobile-cards history-mobile-view">
              {filteredAndSortedRecords.map((item) => {
                const itemRisk = typeof item.riskScore === 'number' ? item.riskScore : (item.risk_score || 0);
                const itemVerdict = formatVerdict(item.verdict);
                const itemDate = formatFirestoreTimestamp(item.createdAt);
                const itemTarget = item.input || item.url || 'Unknown target';
                const itemType = (item.type || 'url').toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="cyber-card history-mobile-card cyber-card-interactive"
                    onClick={() => setSelectedRecord(item)}
                    data-testid={`history-mobile-card-${item.id}`}
                  >
                    <div className="history-mobile-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Badge status={itemVerdict} size="sm">
                          {itemVerdict} ({itemRisk}/100)
                        </Badge>
                        {item.isLocalOnly && (
                          <span className="badge-tier" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                            Local
                          </span>
                        )}
                      </div>
                      <span className="badge-chip font-mono" style={{ fontSize: '0.6875rem' }}>
                        {itemType === 'QR' ? '📷 QR' : itemType === 'MESSAGE' ? '💬 SMS' : '🌐 URL'}
                      </span>
                    </div>

                    <div className="history-mobile-body">
                      <span className="history-mobile-target font-mono" title={itemTarget}>
                        {itemTarget}
                      </span>
                    </div>

                    <div className="history-mobile-footer">
                      <span className="history-mobile-date font-mono">
                        {itemDate}
                      </span>

                      <div className="row-actions-group" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedRecord(item)}
                          title="Inspect complete telemetry"
                          data-testid={`mobile-view-detail-${item.id}`}
                        >
                          🔍 Inspect
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-delete-row"
                          onClick={(e) => handleDeleteScan(e, item.id)}
                          disabled={deletingId === item.id}
                          title="Delete this record"
                          aria-label="Delete scan record"
                          data-testid={`mobile-delete-scan-${item.id}`}
                        >
                          {deletingId === item.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
