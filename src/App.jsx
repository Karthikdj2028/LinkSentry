import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, ThemeProvider, ScanProvider, useAuth } from './context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import OverviewPage from './pages/OverviewPage';
import ScannerPage from './pages/ScannerPage';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SecurityCenterPage from './pages/SecurityCenterPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
import './App.css';

/**
 * Maps URL pathname to LinkSentry active tab ID
 */
function getTabFromPath(pathname) {
  const cleanPath = (pathname || window.location.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/overview' || cleanPath === '/home' || cleanPath === '/dashboard') {
    return 'overview';
  }
  if (cleanPath.startsWith('/scanner')) return 'scanner';
  if (cleanPath.startsWith('/history')) return 'history';
  if (cleanPath.startsWith('/analytics')) return 'analytics';
  if (cleanPath.startsWith('/security-center') || cleanPath.startsWith('/security')) return 'security-center';
  if (cleanPath.startsWith('/profile')) return 'profile';
  return 'overview';
}

/**
 * Maps tab ID to URL pathname
 */
function getPathFromTab(tabId, subTab = 'url') {
  switch (tabId) {
    case 'overview':
    case 'home':
    case 'dashboard':
      return '/';
    case 'scanner':
      return subTab && subTab !== 'url' ? `/scanner?type=${subTab}` : '/scanner';
    case 'history':
      return '/history';
    case 'analytics':
      return '/analytics';
    case 'security-center':
      return '/security-center';
    case 'profile':
      return '/profile';
    default:
      return '/';
  }
}

/**
 * Inner Application Content with Protected Routes & Full History Sync
 */
function MainContent() {
  const { currentUser, loading } = useAuth();
  
  // Initial tab & subtab state derived from URL
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));
  
  const [scannerSubTab, setScannerSubTab] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get('type');
    return type === 'qr' || type === 'message' ? type : 'url';
  });

  // Handle browser popstate (Back / Forward button clicks)
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = getTabFromPath(window.location.pathname);
      const searchParams = new URLSearchParams(window.location.search);
      const subType = searchParams.get('type') || 'url';
      
      setActiveTab(targetTab);
      if (targetTab === 'scanner') {
        setScannerSubTab(subType === 'qr' || subType === 'message' ? subType : 'url');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // General tab change handler with pushState history synchronization
  const handleSelectTab = useCallback((tabId, pushHistory = true) => {
    setActiveTab(tabId);
    const newPath = getPathFromTab(tabId, scannerSubTab);
    
    if (pushHistory && window.location.pathname !== newPath) {
      window.history.pushState({ tab: tabId }, '', newPath);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scannerSubTab]);

  // Direct scanner subtab navigation handler
  const handleNavigateToScanner = useCallback((subTab = 'url') => {
    setScannerSubTab(subTab);
    setActiveTab('scanner');
    const newPath = `/scanner?type=${subTab}`;
    window.history.pushState({ tab: 'scanner', subTab }, '', newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 1. Loading / Initializing Auth State Splash View
  if (loading) {
    return (
      <div className="auth-loading-splash">
        <div className="splash-card">
          <div className="scanning-radar-container">
            <div className="scanning-radar-sweep" />
            <div className="scanning-radar-grid" />
            <div className="scanning-radar-crosshair" />
          </div>
          <div className="splash-text-group">
            <h2 className="splash-title font-mono">LINK<span className="brand-highlight">SENTRY</span></h2>
            <p className="splash-status font-mono text-cyan">INITIALIZING SECURITY SUBSYSTEMS...</p>
            <span className="splash-sub">Verifying client token persistence</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated View: Login & Registration Portal
  if (!currentUser) {
    return <AuthPage />;
  }

  // 3. Authenticated View: Full LinkSentry Platform
  return (
    <div className="app-layout animate-fade-in">
      {/* Top Navigation Bar */}
      <Navbar 
        activeTab={activeTab} 
        onSelectTab={handleSelectTab} 
      />

      {/* Main Content Area */}
      <main className="main-content-viewport">
        {(activeTab === 'overview' || activeTab === 'home' || activeTab === 'dashboard') && (
          <OverviewPage 
            onNavigateToScanner={handleNavigateToScanner} 
            onSelectTab={handleSelectTab} 
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerPage 
            key={scannerSubTab}
            initialSubTab={scannerSubTab} 
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPage />
        )}

        {activeTab === 'security-center' && (
          <SecurityCenterPage />
        )}

        {activeTab === 'profile' && (
          <ProfilePage />
        )}
      </main>

      {/* Cybersecurity Footer */}
      <Footer 
        onSelectTab={handleSelectTab} 
      />
    </div>
  );
}

/**
 * LinkSentry Root Application
 * Provides Firebase Authentication, Theme, and Shared Scan contexts across the entire tree
 */
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ScanProvider>
          <MainContent />
        </ScanProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

