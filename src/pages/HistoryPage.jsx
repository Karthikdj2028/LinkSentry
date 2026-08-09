import { useState } from 'react';
import Badge from '../components/Badge';
import { MOCK_HISTORY } from '../data/mockData';

/**
 * HistoryPage Component
 * Displays audit logs and scan history with filtering and search
 * 
 * TODO: In Stage 2, replace MOCK_HISTORY with Firebase Firestore queries:
 * db.collection('users').doc(userId).collection('scans').orderBy('date', 'desc')
 */
export default function HistoryPage() {
  const [historyList] = useState(MOCK_HISTORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'URL' | 'QR' | 'Message'
  const [resultFilter, setResultFilter] = useState('ALL'); // 'ALL' | 'Safe' | 'Suspicious' | 'Phishing'
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Filter records based on active criteria
  const filteredRecords = historyList.filter((item) => {
    const matchesSearch = 
      item.input.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || item.scanType.toUpperCase() === typeFilter;
    const matchesResult = resultFilter === 'ALL' || item.result.toLowerCase() === resultFilter.toLowerCase();

    return matchesSearch && matchesType && matchesResult;
  });

  return (
    <div className="page-container history-page animate-fade-in">
      <div className="container">
        {/* Header */}
        <div className="page-hero-header">
          <div className="hero-tagline-badge">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#06b6d4' }} />
            <span className="font-mono text-cyan">SECURITY AUDIT TRAIL</span>
          </div>
          <h1 className="page-main-heading">Scan History & Telemetry Logs</h1>
          <p className="page-subheading">
            Review previous threat assessments, investigation records, and security classifications.
          </p>
        </div>

        {/* Temporary Mock Data Notice Banner */}
        <div className="cyber-card mock-notice-banner">
          <div className="notice-icon">⚠️</div>
          <div className="notice-text-group">
            <strong className="notice-title">Stage 1 Notice: Demonstration Mock Dataset Active</strong>
            <p className="notice-body">
              This log view currently renders simulated scan activity. In <strong>Stage 2</strong>, this will be bound directly to your real-time <strong>Cloud Firestore</strong> database for synchronized multi-device history.
            </p>
          </div>
          <span className="font-mono mock-badge">FIREBASE SYNC: PLANNED (STAGE 2)</span>
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
                placeholder="Search history by URL, message text, or threat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="results-count-row">
            <span className="results-count-text font-mono">
              Showing <strong>{filteredRecords.length}</strong> of <strong>{historyList.length}</strong> logged scans
            </span>
          </div>
        </div>

        {/* Table View */}
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
                  filteredRecords.map((item) => (
                    <tr 
                      key={item.id}
                      className="history-row-clickable"
                      onClick={() => setSelectedRecord(item)}
                    >
                      <td>
                        <span className={`type-tag tag-${item.scanType.toLowerCase()} font-mono`}>
                          {item.scanType === 'URL' ? '🌐 URL' : item.scanType === 'QR' ? '📷 QR' : '💬 SMS'}
                        </span>
                      </td>
                      <td className="target-cell">
                        <span className="target-preview-text font-mono" title={item.input}>
                          {item.input}
                        </span>
                      </td>
                      <td>
                        <Badge status={item.result} size="sm">
                          {item.result}
                        </Badge>
                      </td>
                      <td>
                        <div className="table-score-container">
                          <span className={`table-score font-mono ${
                            item.riskScore > 70 ? 'text-red' : item.riskScore > 30 ? 'text-amber' : 'text-green'
                          }`}>
                            {item.riskScore}/100
                          </span>
                          <div className="table-score-bar-bg">
                            <div 
                              className={`table-score-bar-fill ${
                                item.riskScore > 70 ? 'bg-red' : item.riskScore > 30 ? 'bg-amber' : 'bg-green'
                              }`}
                              style={{ width: `${item.riskScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="timestamp-cell font-mono">
                        {item.date}
                      </td>
                      <td style={{ textAlign: 'right' }}>
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
                      </td>
                    </tr>
                  ))
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

        {/* Detail Inspection Modal */}
        {selectedRecord && (
          <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
            <div className="cyber-card modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <span className="font-mono text-cyan">[{selectedRecord.id}] SCAN AUDIT RECORD</span>
                  <h3>{selectedRecord.scanType} Threat Assessment</h3>
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
                    <span className="info-value font-mono">{selectedRecord.input}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Result Status</span>
                    <div>
                      <Badge status={selectedRecord.result} size="md">
                        {selectedRecord.result}
                      </Badge>
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Risk Score</span>
                    <span className="info-value font-mono">{selectedRecord.riskScore} / 100</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="info-label">Scan Recorded At</span>
                    <span className="info-value font-mono">{selectedRecord.date}</span>
                  </div>
                </div>

                <div className="modal-heuristics-box">
                  <h4>Diagnostic Metadata</h4>
                  <div className="heuristics-list">
                    {Object.entries(selectedRecord.details || {}).map(([k, v]) => (
                      <div key={k} className="heuristic-item">
                        <span className="heuristic-key">
                          {k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <span className="heuristic-val font-mono">
                          {Array.isArray(v) ? v.join(', ') : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <span className="font-mono text-muted text-sm">
                  // TODO: Firebase real-time listener will enable live log deletion and export
                </span>
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
