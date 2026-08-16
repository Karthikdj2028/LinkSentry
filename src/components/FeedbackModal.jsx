import { useState } from 'react';
import { useAuth } from '../context';
import { submitUserFeedback } from '../firebase';

/**
 * FeedbackModal Component
 * Allows users to submit bug reports, false positive reports, and feature requests.
 */
export default function FeedbackModal({ onClose }) {
  const { currentUser } = useAuth();
  const [category, setCategory] = useState('Bug Report');
  const [description, setDescription] = useState('');
  const [payload, setPayload] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Bug Report', 'Threat False Positive', 'Feature Request'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe your feedback or issue.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (currentUser && currentUser.uid) {
        await submitUserFeedback(currentUser.uid, {
          category,
          description: description.trim(),
          payload: payload.trim(),
          email: currentUser.email || 'anonymous'
        });
      }
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError('Unable to submit feedback right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card feedback-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">💬</span>
            <div>
              <h3 className="modal-title">Feedback & Bug Report</h3>
              <p className="modal-subtitle">Help improve LinkSentry threat intelligence and UI</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Body */}
        {submitted ? (
          <div className="modal-body text-center py-6">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
            <h4 style={{ color: 'var(--status-safe-text)', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Thank You!
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your {category.toLowerCase()} has been securely submitted to the LinkSentry team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            {error && (
              <div className="auth-error-alert animate-fade-in" style={{ marginBottom: '1rem' }}>
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* Category Chips */}
            <div className="form-group">
              <label className="form-label">Feedback Category</label>
              <div className="category-chips-row">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="feedback-desc" className="form-label">
                Description <span style={{ color: 'var(--status-phishing-text)' }}>*</span>
              </label>
              <textarea
                id="feedback-desc"
                className="form-textarea"
                placeholder="Describe what happened, what you expected, or suggest an enhancement..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Optional Payload / URL */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="feedback-payload" className="form-label">
                Target URL / Artifact (Optional)
              </label>
              <input
                id="feedback-payload"
                type="text"
                className="form-input font-mono"
                placeholder="https://example-phish-domain.com or QR text..."
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
