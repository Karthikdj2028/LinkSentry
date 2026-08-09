/**
 * Reusable Threat Status Badge
 * Variants: 'Safe' | 'Suspicious' | 'Phishing' | 'Info' | 'Neutral'
 */
export default function Badge({ status, size = 'md', pulse = false, children }) {
  const normalized = (status || 'neutral').toLowerCase();

  const getStyleClass = () => {
    switch (normalized) {
      case 'safe':
        return 'badge-safe';
      case 'suspicious':
        return 'badge-suspicious';
      case 'phishing':
      case 'critical':
      case 'malicious':
        return 'badge-phishing';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <span className={`cyber-badge ${getStyleClass()} badge-${size}`}>
      {pulse && <span className="cyber-badge-dot pulse" />}
      {children || status}
    </span>
  );
}
