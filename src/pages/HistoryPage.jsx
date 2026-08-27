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
        minute: '2-digit',
      });
    }
    if (typeof createdAt.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const parsedDate = new Date(createdAt);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

function getVectorLabel(type) {
  const t = (type || 'url').toLowerCase();
  if (t === 'qr') return '📷 QR';
  if (t === 'message') return '💬 Message';
  return '🌐 URL';
}

export default function HistoryPage({ onSelectTab, onNavigateToScanner }) {
  const { scans, loading, error, refreshLocalScans, removeScan } = useScans();
  const { securityPreferences } = useTheme();
  const isCloudSyncOff = securityPreferences?.cloudSync === false;

  const [searchTerm, setSearchTerm] = useState('');
  const [vectorFilter, setVectorFilter] = useState('ALL'); // 'ALL' | 'URL' | 'QR' | 'MESSAGE'
  const [verdictFilter, setVerdictFilter] = useState('ALL'); // 'ALL' | 'SAFE' | 'SUSPICIOUS' | 'PHISHING' | 'UNREACHABLE' | 'INVALID'
  const [sortBy, setSortBy] = useState('NEWEST');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleRefresh = () => {
    refreshLocalScans();
  };

  const handleLaunchScanner = (vector = 'url') => {
    if (onNavigateToScanner) {
      onNavigateToScanner(vector);
    } else if (onSelectTab) {
      onSelectTab('scanner');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setVectorFilter('ALL');
    setVerdictFilter('ALL');
    setSortBy('NEWEST');
  };

  const handleDeleteScan = async (e, scanId) => {
    e?.stopPropagation();
    if (!scanId) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this scan record from your history?');
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

  // Memoized Filtering and Sorting over real unified scan records
  const filteredAndSortedRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = scans.filter((item) => {
      const scanInput = item.input || item.url || '';
      const scanDomain = item.domain || '';
      const scanType = (item.type || 'url').toUpperCase();
      const scanVerdict = (item.verdict || 'safe').toUpperCase();
      const scanEngine = item.engine || '';
      const scanIndicators = Array.isArray(item.indicators) ? item.indicators.join(' ') : '';

      // Text search
      const matchesSearch =
        !q ||
        scanInput.toLowerCase().includes(q) ||
        scanDomain.toLowerCase().includes(q) ||
        scanType.toLowerCase().includes(q) ||
        scanVerdict.toLowerCase().includes(q) ||
        scanEngine.toLowerCase().includes(q) ||
        scanIndicators.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Vector filter
      if (vectorFilter !== 'ALL' && scanType !== vectorFilter) {
        return false;
      }

      // Verdict filter
      if (verdictFilter !== 'ALL') {
        if (verdictFilter === 'SAFE' && scanVerdict !== 'SAFE') return false;
        if (verdictFilter === 'SUSPICIOUS' && scanVerdict !== 'SUSPICIOUS') return false;
        if (verdictFilter === 'PHISHING' && scanVerdict !== 'PHISHING') return false;
        if (verdictFilter === 'UNREACHABLE' && scanVerdict !== 'UNREACHABLE' && scanVerdict !== 'NON-EXISTENT' && scanVerdict !== 'NON_EXISTENT') return false;
        if (verdictFilter === 'INVALID' && scanVerdict !== 'INVALID') return false;
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
  }, [scans, searchTerm, vectorFilter, verdictFilter, sortBy]);

  const hasActiveFilter = searchTerm.trim() !== '' || vectorFilter !== 'ALL' || verdictFilter !== 'ALL' || sortBy !== 'NEWEST';

  return (
    <div className="page-container history-page animate-fade-in">
      <div className="container">
        {/* Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--brand-cyan)' }} />
            <span className="font-mono">SECURITY LOGS</span>
          </div>
          <h1 className="page-main-heading">Scan History</h1>
          <p className="page-subheading">
            Review, filter, and inspect previous threat assessments across URL, QR, and Message vectors.
          </p>
        </div>

        {/* Sync Status Banner */}
        <div className="cyber-card auth-status-banner" style={{ marginBottom: '1.75rem' }}>
          <div className="status-icon-box">{isCloudSyncOff ? '📱' : '🗄️'}</div>
          <div className="status-text-group">
            <strong className="status-title">
              {isCloudSyncOff ? 'Local Device Storage Active' : 'Cloud Audit Logs Synchronized'}
            </strong>
            <p className="status-body">
              {isCloudSyncOff ? (
                <span>
                  <strong>Cloud sync is off</strong> — scan records remain stored privately on this device ({scans.length} record{scans.length === 1 ? '' : 's'}).
                </span>
              ) : (
                <span>
                  {scans.length} scan record{scans.length === 1 ? '' : 's'} synchronized in your private audit trail.
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
          {/* Top Row: Search Input + Sort Dropdown */}
          <div className="history-search-sort-row">
            <div className="search-box-wrapper history-search-wrapper">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="form-input search-input font-mono"
                placeholder="Search history by URL, domain, payload, or verdict..."
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

          {/* Filter Categories: Vectors & Verdicts */}
          <div className="history-filters-container">
            {/* Scan Vector Chips */}
            <div className="history-filter-group">
              <span className="history-filter-group-label font-mono">Vector:</span>
              <div className="history-filter-chips-row" role="tablist" aria-label="Filter by Scan Vector">
                {[
                  { id: 'ALL', label: 'All Vectors' },
                  { id: 'URL', label: '🌐 URL' },
                  { id: 'QR', label: '📷 QR' },
                  { id: 'MESSAGE', label: '💬 Message' },
                ].map((chip) => {
                  const isActive = vectorFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`filter-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setVectorFilter(chip.id)}
                      data-testid={`vector-filter-${chip.id.toLowerCase()}`}
                      role="tab"
                      aria-selected={isActive}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verdict Chips */}
            <div className="history-filter-group">
              <span className="history-filter-group-label font-mono">Verdict:</span>
              <div className="history-filter-chips-row" role="tablist" aria-label="Filter by Verdict">
                {[
                  { id: 'ALL', label: 'All Verdicts' },
                  { id: 'SAFE', label: 'Safe' },
                  { id: 'SUSPICIOUS', label: 'Suspicious' },
                  { id: 'PHISHING', label: 'Phishing' },
                  { id: 'UNREACHABLE', label: 'Unreachable' },
                  { id: 'INVALID', label: 'Invalid' },
                ].map((chip) => {
                  const isActive = verdictFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`filter-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setVerdictFilter(chip.id)}
                      data-testid={`verdict-filter-${chip.id.toLowerCase()}`}
                      role="tab"
                      aria-selected={isActive}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Count & Filter Summary Row */}
          <div className="history-results-summary">
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing <strong>{filteredAndSortedRecords.length}</strong> of <strong>{scans.length}</strong> record{scans.length === 1 ? '' : 's'}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearFilters}
                data-testid="history-clear-all-filters-btn"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                Reset All Filters
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
                ? `No scan records matching "${searchTerm}". Try adjusting your search query or reset your filters.`
                : 'No scan records match the selected vector or verdict filters.'}
            </p>

            {scans.length === 0 ? (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleLaunchScanner('url')}
                  data-testid="history-empty-launch-url-btn"
                >
                  🌐 Scan a URL ➔
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLaunchScanner('qr')}
                  data-testid="history-empty-launch-qr-btn"
                >
                  📷 Scan QR Code
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLaunchScanner('message')}
                  data-testid="history-empty-launch-message-btn"
                >
                  💬 Scan Message
                </button>
              </div>
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
                            {getVectorLabel(itemType)}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                            {item.engine || 'V3.4 ML'}
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
                        {getVectorLabel(itemType)}
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
