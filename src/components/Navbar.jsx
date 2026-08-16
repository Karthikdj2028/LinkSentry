import { useState } from 'react';
import { useAuth, useTheme } from '../context';

/**
 * Navbar Component for LinkSentry
 * Handles main tab navigation: Overview, Scanner, History, Analytics, Security Center, Profile
 * Includes quick theme switcher, flexible unclipped account status, and responsive mobile drawer menu.
 */
export default function Navbar({ activeTab, onSelectTab }) {
  const { currentUser } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'scanner', label: 'Scanner', icon: '🛡️' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'security-center', label: 'Security Center', icon: '🔒' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const userEmail = currentUser?.email || 'analyst@linksentry.io';
  const userSnippet = currentUser?.email
    ? currentUser.email.split('@')[0]
    : 'Analyst';

  return (
    <header className="site-header">
      <div className="container header-container">
        {/* Brand Logo */}
        <div 
          className="brand-logo"
          onClick={() => handleNavClick('overview')}
          role="button"
          tabIndex={0}
          data-testid="nav-brand-logo"
        >
          <div className="logo-shield-icon">
            <svg 
              width="24" 
              height="24" 
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

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'overview' && (activeTab === 'home' || activeTab === 'dashboard'));
              return (
                <li key={item.id} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    data-testid={`nav-tab-${item.id}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {isActive && <div className="active-indicator" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Header Utilities (Theme Switcher + Status) */}
        <div className="header-right-group">
          {/* Quick Theme Toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Current Theme: ${theme.toUpperCase()} (${resolvedTheme} mode). Click to toggle.`}
            aria-label="Toggle theme mode"
            data-testid="nav-theme-toggle"
          >
            <span className="theme-toggle-icon">
              {resolvedTheme === 'dark' ? '🌙' : '☀️'}
            </span>
          </button>

          {/* User Account Status Pill (Clickable -> Profile) */}
          <div 
            className="system-status-pill desktop-only" 
            onClick={() => handleNavClick('profile')}
            role="button"
            tabIndex={0}
            title={`Logged in as ${userEmail}. Click to view Profile.`}
            data-testid="nav-system-status"
          >
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-safe)' }} />
            <span className="status-text font-mono">{userSnippet}</span>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-menu-toggle mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            data-testid="mobile-menu-toggle"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer mobile-only animate-fade-in" data-testid="mobile-nav-drawer">
          <div className="mobile-drawer-status" onClick={() => handleNavClick('profile')} role="button" tabIndex={0}>
            <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-safe)' }} />
            <span className="status-text font-mono" title={userEmail}>
              {userEmail}
            </span>
          </div>

          <ul className="mobile-nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id || (item.id === 'overview' && (activeTab === 'home' || activeTab === 'dashboard'));
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    data-testid={`mobile-nav-tab-${item.id}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Mobile Appearance Selector */}
          <div className="mobile-drawer-theme-section">
            <span className="theme-section-label">Appearance</span>
            <div className="mobile-theme-pill-group">
              <button 
                type="button" 
                className={`theme-pill ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
              >
                💻 System
              </button>
              <button 
                type="button" 
                className={`theme-pill ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                ☀️ Light
              </button>
              <button 
                type="button" 
                className={`theme-pill ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
