import { useState, useEffect } from 'react';
import Badge from '../components/Badge';
import { useAuth } from '../context';
import { getUserScans, subscribeToUserScans, deleteScan } from '../firebase';

/**
 * Format Firestore timestamp safely.
 * Handles Firestore Timestamp objects, JS Dates, ISO strings, and null/undefined values.
 */
function formatFirestoreTimestamp(createdAt) {
  if (!createdAt) {
    return 'Pending timestamp';
  }

  try {
    // Firestore Timestamp instance (has toDate method)
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

    // Timestamp object with seconds field
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

    // Standard Date or parseable string/number
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
 * Capitalize verdict string for badge and table display
 */
function formatVerdict(verdict) {
  if (!verdict) return 'Safe';
  const str = String(verdict).toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * HistoryPage Component
 * Displays real Cloud Firestore scan records under users/{currentUser.uid}/scans
 * with live search, scan-type filters, verdict filters, detail modal, and delete actions.
 */
export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'URL' | 'QR' | 'MESSAGE'
  const [resultFilter, setResultFilter] = useState('ALL'); // 'ALL' | 'Safe' | 'Suspicious' | 'Phishing'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const userId = currentUser?.uid;

  // Real-time bidirectional synchronization with Cloud Firestore
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setScans([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserScans(
      userId,
      (liveScans) => {
        setScans(liveScans);
        setError('');
        setLoading(false);
      },
      (err) => {
        console.error('Failed to stream user scan history:', err);
        setError('Failed to retrieve security scan history from Cloud Firestore. Please check your connection.');
        setLoading(false);
      },
      100
    );

    return () => unsubscribe();
  }, [userId]);

  const handleRefresh = () => {
    // Subscription updates automatically, but we can set loading briefly for user visual feedback
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  // Delete a scan document from Firestore and local state
  const handleDeleteScan = async (e, scanId) => {
    e?.stopPropagation();
    if (!userId || !scanId) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this scan audit record? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      setDeletingId(scanId);
      await deleteScan(userId, scanId);
      
      // Update local state immediately without requiring full reload
      setScans((prev) => prev.filter((item) => item.id !== scanId));
      if (selectedRecord?.id === scanId) {
        setSelectedRecord(null);
      }
    } catch (delErr) {
      console.error('Failed to delete scan record:', delErr);
      alert('Failed to delete scan record from Cloud Firestore.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter records based on search term, scan type, and verdict
  const filteredRecords = scans.filter((item) => {
    const scanInput = item.input || item.url || '';
    const scanDomain = item.domain || '';
    const scanType = (item.type || 'url').toUpperCase();
    const scanVerdict = formatVerdict(item.verdict);
    const scanEngine = item.engine || '';

    const matchesSearch =
      scanInput.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanDomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanVerdict.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scanEngine.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'ALL' || scanType === typeFilter;

    const matchesResult =
      resultFilter === 'ALL' || scanVerdict.toLowerCase() === resultFilter.toLowerCase();

    return matchesSearch && matchesType && matchesResult;
  });

  return (
    <div className="page-container history-page animate-fade-in">
      <div className="container">
        {/* Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
            <span className="font-mono text-cyan">CLOUD FIRESTORE AUDIT TRAIL</span>
          </div>
          <h1 className="page-main-heading">Scan History & Telemetry Logs</h1>
          <p className="page-subheading">
            Review previous threat assessments, investigation records, and security classifications synchronized with your Cloud Firestore account.
          </p>
        </div>

        {/* Firestore Connection Banner */}
        <div className="cyber-card auth-status-banner">
          <div className="status-icon-box">🗄️</div>
          <div className="status-text-group">
            <strong className="status-title">Cloud Firestore Audit Log Synchronized</strong>
            <p className="status-body">
              Displaying authenticated audit logs from your synchronized threat database.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm logout-btn-top"
            onClick={handleRefresh}
            disabled={loading}
            title="Reload latest records from Cloud Firestore"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Logs'}
          </button>
        </div>

        {/* Filter and Search Controls */}
        <div className="cyber-card history-controls-card">
          <div className="controls-grid">
            {/* Search Input */}
            <div className="search-box-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input search-input font-mono"
                placeholder="Search history by URL, domain, verdict, or engine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading && scans.length === 0}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by Scan Type */}
            <div className="filter-group">
              <span className="filter-label">Scan Type:</span>
              <div className="filter-chips">
                {['ALL', 'URL', 'QR', 'MESSAGE'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`filter-chip ${typeFilter === type ? 'active' : ''}`}
                    onClick={() => setTypeFilter(type)}
                    disabled={loading && scans.length === 0}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Result */}
            <div className="filter-group">
              <span className="filter-label">Verdict:</span>
              <div className="filter-chips">
                {['ALL', 'Safe', 'Suspicious', 'Phishing'].map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={`filter-chip ${resultFilter === res ? 'active' : ''}`}
                    onClick={() => setResultFilter(res)}
                    disabled={loading && scans.length === 0}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="results-count-row">
            <span className="results-count-text font-mono">
              Showing <strong>{filteredRecords.length}</strong> of <strong>{scans.length}</strong> logged scans
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && scans.length === 0 && (
          <div className="cyber-card scanning-in-progress" style={{ padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div className="scanning-radar-container">
              <div className="scanning-radar-sweep" />
              <div className="scanning-radar-grid" />
              <div className="scanning-radar-crosshair" />
            </div>
            <div className="scanning-status-texts font-mono">
              <p className="status-primary-text">RETRIEVING SECURITY AUDIT TRAIL...</p>
              <p className="status-sub-text">Querying Cloud Firestore records for active analyst session...</p>
            </div>
          </div>
        )}

        {/* Error State with Retry Action */}
        {!loading && error && (
          <div className="cyber-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>⚠️</span>
            <h3 style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>Cloud Firestore History Unavailable</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRefresh}
            >
              🔄 Retry Query
            </button>
          </div>
        )}

        {/* Empty State: No Scans in Firestore Yet */}
        {!loading && !error && scans.length === 0 && (
          <div className="cyber-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No scans recorded yet</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
              Your Cloud Firestore scan audit trail is currently empty. Any completed URL, QR code, or Message scans will automatically appear here.
            </p>
            <span className="font-mono text-cyan text-sm">
              ⚡ Go to the Scanner tab and analyze a URL to record your first threat telemetry log.
            </span>
          </div>
        )}

        {/* Table View */}
        {(!loading || scans.length > 0) && !error && scans.length > 0 && (
          <div className="cyber-card history-table-card">
            <div className="table-responsive">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Scanned Input / Target</th>
                    <th>Verdict</th>
                    <th>Risk Score</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((item) => {
                      const itemType = (item.type || 'url').toUpperCase();
                      const itemVerdict = formatVerdict(item.verdict);
                      const itemInput = item.input || item.url || 'Unknown input';
                      const itemRisk = typeof item.riskScore === 'number' ? item.riskScore : (typeof item.risk_score === 'number' ? item.risk_score : 0);
                      const itemDate = formatFirestoreTimestamp(item.createdAt);
                      const isDeleting = deletingId === item.id;

                      return (
                        <tr 
                          key={item.id}
                          className="history-row-clickable"
                          onClick={() => setSelectedRecord(item)}
                        >
                          <td>
                            <span className={`type-tag tag-${itemType.toLowerCase()} font-mono`}>
                              {itemType === 'URL' ? '🌐 URL' : itemType === 'QR' ? '📷 QR' : '💬 SMS'}
                            </span>
                          </td>
                          <td className="target-cell">
                            <span className="target-preview-text font-mono" title={itemInput}>
                              {itemInput}
                            </span>
                            {item.domain && item.domain !== 'N/A' && (
                              <span className="text-muted font-mono" style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>
                                Host: {item.domain}
                              </span>
                            )}
                          </td>
                          <td>
                            <Badge status={itemVerdict} size="sm">
                              {itemVerdict}
                            </Badge>
                          </td>
                          <td>
                            <div className="table-score-container">
                              <span className={`table-score font-mono ${
                                itemRisk > 70 ? 'text-red' : itemRisk > 30 ? 'text-amber' : 'text-green'
                              }`}>
                                {itemRisk}/100
                              </span>
                              <div className="table-score-bar-bg">
                                <div 
                                  className={`table-score-bar-fill ${
                                    itemRisk > 70 ? 'bg-red' : itemRisk > 30 ? 'bg-amber' : 'bg-green'
                                  }`}
                                  style={{ width: `${Math.min(itemRisk, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="timestamp-cell font-mono">
                            {itemDate}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecord(item);
                                }}
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                onClick={(e) => handleDeleteScan(e, item.id)}
                                disabled={isDeleting}
                                title="Delete scan record"
                              >
                                {isDeleting ? '...' : '🗑️'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-table-cell">
                        <div className="empty-state-box">
                          <span className="empty-state-icon">🔍</span>
                          <h4>No scans matched your search query</h4>
                          <p>Try clearing filters or search terms to inspect other logs.</p>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSearchTerm('');
                              setTypeFilter('ALL');
                              setResultFilter('ALL');
                            }}
                          >
                            Reset All Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Inspection Modal */}
        {selectedRecord && (
          <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
            <div className="cyber-card modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <span className="font-mono text-cyan">
                    [{selectedRecord.id}] FIRESTORE AUDIT RECORD
                  </span>
                  <h3>{(selectedRecord.type || 'URL').toUpperCase()} Threat Assessment</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedRecord(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="info-label">Target Scanned</span>
                    <span className="info-value font-mono" style={{ wordBreak: 'break-all' }}>
                      {selectedRecord.input || selectedRecord.url}
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Result Verdict</span>
                    <div>
                      <Badge status={formatVerdict(selectedRecord.verdict)} size="md">
                        {formatVerdict(selectedRecord.verdict)}
                      </Badge>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Risk Score</span>
                    <span className="info-value font-mono">
                      {typeof selectedRecord.riskScore === 'number' ? selectedRecord.riskScore : (selectedRecord.risk_score || 0)} / 100
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Scan Recorded At</span>
                    <span className="info-value font-mono">
                      {formatFirestoreTimestamp(selectedRecord.createdAt)}
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Domain / Hostname</span>
                    <span className="info-value font-mono">
                      {selectedRecord.domain || 'N/A'}
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Confidence Score</span>
                    <span className="info-value font-mono">
                      {typeof selectedRecord.confidence === 'number' 
                        ? `${Math.round(selectedRecord.confidence * 100)}%` 
                        : (selectedRecord.confidence || '70%')}
                    </span>
                  </div>
                </div>

                <div className="modal-heuristics-box">
                  <h4>Diagnostic Threat Indicators & Engine</h4>
                  <div className="heuristics-list">
                    <div className="heuristic-item">
                      <span className="heuristic-key">Detection Engine</span>
                      <span className="heuristic-val font-mono">
                        {selectedRecord.engine || 'temporary-rule-based-detector'}
                      </span>
                    </div>
                    <div className="heuristic-item">
                      <span className="heuristic-key">Heuristic Indicators</span>
                      <span className="heuristic-val font-mono">
                        {Array.isArray(selectedRecord.indicators) && selectedRecord.indicators.length > 0
                          ? selectedRecord.indicators.join(', ')
                          : 'No threat indicators detected'}
                      </span>
                    </div>
                    <div className="heuristic-item">
                      <span className="heuristic-key">Document ID</span>
                      <span className="heuristic-val font-mono text-muted">
                        {selectedRecord.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  onClick={(e) => handleDeleteScan(e, selectedRecord.id)}
                  disabled={deletingId === selectedRecord.id}
                >
                  {deletingId === selectedRecord.id ? 'Deleting...' : '🗑️ Delete from Cloud Firestore'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
