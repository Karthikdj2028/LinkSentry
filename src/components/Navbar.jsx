import { useState, useRef, useEffect } from 'react';
import { useAuth, useTheme } from '../context';

/**
 * Navbar Component for LinkSentry (Stitch Design Integration)
 * High-precision cybersecurity header with vector icons, quick theme toggle,
 * live analyst status indicator, and accessible responsive mobile drawer.
 */
export default function Navbar({ activeTab, onSelectTab }) {
  const { currentUser, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      )
    },
    { 
      id: 'scanner', 
      label: 'Scanner', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    },
    { 
      id: 'history', 
      label: 'History', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      )
    },
    { 
      id: 'security-center', 
      label: 'Security Center', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
    setShowAccountMenu(false);
  };

  const handleLogout = async () => {
    try {
      setShowAccountMenu(false);
      setMobileMenuOpen(false);
      await logout();
    } catch (err) {
      console.error('[LinkSentry] Sign out error:', err);
    }
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

        {/* Right Header Utilities (Theme Switcher + Account Section) */}
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
              {resolvedTheme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              )}
            </span>
          </button>

          {/* Desktop Account Menu with Popover */}
          <div className="account-menu-container desktop-only" ref={accountMenuRef} style={{ position: 'relative' }}>
            <div 
              className="system-status-pill" 
              onClick={() => setShowAccountMenu((prev) => !prev)}
              role="button"
              tabIndex={0}
              title={`Account: ${userEmail}. Click for account actions.`}
              data-testid="nav-system-status"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-safe)' }} />
              <span className="status-text font-mono">{userSnippet}</span>
              <span className="dropdown-chevron font-mono" style={{ fontSize: '0.65rem', marginLeft: '0.2rem', color: 'var(--text-muted)' }}>
                {showAccountMenu ? '▲' : '▼'}
              </span>
            </div>

            {showAccountMenu && (
              <div 
                className="account-dropdown-menu animate-fade-in" 
                data-testid="nav-account-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '240px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '0.75rem',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div className="account-dropdown-header" style={{ padding: '0.25rem 0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'block' }}>
                    Signed in as
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all', display: 'block', marginTop: '0.2rem' }} title={userEmail}>
                    {userEmail}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />

                <button
                  type="button"
                  className="nav-dropdown-item"
                  onClick={() => handleNavClick('profile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.6rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  data-testid="nav-profile-link"
                >
                  <span>⚙️</span>
                  <span>Profile & Settings</span>
                </button>

                <button
                  type="button"
                  className="nav-dropdown-item item-danger"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.6rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  data-testid="nav-logout-btn"
                >
                  <span>🔒</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
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

          {/* Mobile Dedicated Account & Sign Out Section */}
          <div className="mobile-drawer-account-section" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="mobile-drawer-status" onClick={() => handleNavClick('profile')} role="button" tabIndex={0} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="cyber-badge-dot pulse" style={{ backgroundColor: 'var(--status-safe)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Account</span>
                <span className="status-text font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all' }} title={userEmail}>
                  {userEmail}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleNavClick('profile')}
              >
                ⚙️ Profile
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                onClick={handleLogout}
                data-testid="mobile-logout-btn"
              >
                🔒 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

