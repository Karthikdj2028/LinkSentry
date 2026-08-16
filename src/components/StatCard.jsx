/**
 * StatCard Component for Dashboard, Analytics & Overview metrics
 */
export default function StatCard({ 
  title, 
  label,
  value, 
  subtitle, 
  description,
  icon, 
  trend, 
  variant = 'cyan',
  badge 
}) {
  const displayTitle = title || label || '';
  const displaySubtitle = subtitle || description || '';

  return (
    <div className={`cyber-card stat-card stat-card-${variant}`}>
      <div className="stat-card-top">
        <div className="stat-card-info">
          <span className="stat-card-title">{displayTitle}</span>
          <div className="stat-card-value-row">
            <h3 className="stat-card-value font-mono">{value}</h3>
            {badge && <span className="stat-card-badge">{badge}</span>}
          </div>
        </div>
        {icon && (
          <div className={`stat-card-icon-box stat-icon-${variant}`}>
            {icon}
          </div>
        )}
      </div>

      {(displaySubtitle || trend) && (
        <div className="stat-card-bottom">
          {trend && (
            <span className={`stat-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.text}
            </span>
          )}
          {displaySubtitle && <span className="stat-subtitle">{displaySubtitle}</span>}
        </div>
      )}
    </div>
  );
}
