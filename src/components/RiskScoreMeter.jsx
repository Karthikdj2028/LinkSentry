/**
 * RiskScoreMeter Component
 * Displays a 0-100 cybersecurity threat score with color grading
 */
export default function RiskScoreMeter({ score = 0, size = 'normal', showLabel = true }) {
  // Determine risk level based on score
  let level = 'Low Risk / Safe';
  let colorClass = 'score-safe';
  let glowColor = 'rgba(16, 185, 129, 0.5)';

  if (score > 70) {
    level = 'High Risk / Phishing';
    colorClass = 'score-phishing';
    glowColor = 'rgba(239, 68, 68, 0.5)';
  } else if (score > 30) {
    level = 'Suspicious / Elevated Risk';
    colorClass = 'score-suspicious';
    glowColor = 'rgba(245, 158, 11, 0.5)';
  }

  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className={`risk-score-wrapper ${size}`} data-testid="risk-score-meter">
      <div className="risk-score-header">
        {showLabel && <span className="risk-score-title">Threat Risk Index</span>}
        <div className="risk-score-value-container">
          <span className={`risk-score-number font-mono ${colorClass}`} data-testid="risk-score-value">{clampedScore}</span>
          <span className="risk-score-max">/100</span>
        </div>
      </div>

      <div className="risk-meter-track">
        <div 
          className={`risk-meter-fill ${colorClass}`}
          style={{ 
            width: `${clampedScore}%`,
            boxShadow: `0 0 12px ${glowColor}`
          }}
        />
      </div>

      <div className="risk-meter-labels">
        <span className="risk-level-badge">{level}</span>
        <span className="risk-scale-text">0: Safe • 50: Suspicious • 100: Critical</span>
      </div>
    </div>
  );
}
