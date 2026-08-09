/**
 * StatCard Component for Dashboard & Overview metrics
 */
export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  variant = 'cyan',
  badge 
}) {
  return (
    <div className={`cyber-card stat-card stat-card-${variant}`}>
      <div className="stat-card-top">
        <div className="stat-card-info">
          <span className="stat-card-title">{title}</span>
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

      {(subtitle || trend) && (
        <div className="stat-card-bottom">
          {trend && (
            <span className={`stat-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.text}
            </span>
          )}
          {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
