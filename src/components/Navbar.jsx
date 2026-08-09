import { useState } from 'react';

/**
 * Navbar Component for LinkSentry
 * Handles main tab navigation: Home, Scanner, History, Dashboard, Profile
 * Fully responsive with desktop navigation and mobile drawer menu
 */
export default function Navbar({ activeTab, onSelectTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'scanner', label: 'Scanner', icon: '🛡️', badge: '3-in-1' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container header-container">
        {/* Brand Logo */}
        <div 
          className="brand-logo"
          onClick={() => handleNavClick('home')}
          role="button"
          tabIndex={0}
        >
          <div className="logo-shield-icon">
            <svg 
              width="26" 
              height="26" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="brand-text-group">
            <div className="brand-title">
              LINK<span className="brand-highlight">SENTRY</span>
            </div>
            <span className="brand-subtitle">AI PHISHING DEFENSE</span>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div className="system-status-pill desktop-only">
          <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
          <span className="status-text font-mono">SHIELD: ACTIVE</span>
          <span className="status-version">v0.1.0</span>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className="nav-tag">{item.badge}</span>}
                    {isActive && <div className="active-indicator" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-toggle mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer mobile-only animate-fade-in">
          <div className="mobile-drawer-status">
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: '#10b981' }} />
            <span className="status-text font-mono">LINK SENTRY ONLINE • MOCK MODE</span>
          </div>
          <ul className="mobile-nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className="nav-tag">{item.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
