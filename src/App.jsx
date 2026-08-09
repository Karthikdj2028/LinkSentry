import { useState } from 'react';
import { AuthProvider, useAuth } from './context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/auth/AuthPage';
import './App.css';

/**
 * Inner Application Content with Protected Routes
 */
function MainContent() {
  const { currentUser, loading } = useAuth();
  
  // Main active navigation tab: 'home' | 'scanner' | 'history' | 'dashboard' | 'profile'
  const [activeTab, setActiveTab] = useState('home');
  
  // Scanner subtab state: 'url' | 'qr' | 'message'
  const [scannerSubTab, setScannerSubTab] = useState('url');

  // Navigation handler allowing jump directly into a specific scanner tool
  const handleNavigateToScanner = (subTab = 'url') => {
    setScannerSubTab(subTab);
    setActiveTab('scanner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // General tab change handler
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <p className="splash-status font-mono text-cyan">INITIALIZING SECURITY SUBSYSTEMS & AUTH SESSION...</p>
            <span className="splash-sub">Verifying client token persistence with Firebase</span>
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
        {activeTab === 'home' && (
          <HomePage 
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

        {activeTab === 'dashboard' && (
          <DashboardPage 
            onNavigateToScanner={handleNavigateToScanner} 
          />
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
 * Provides Firebase Authentication context across the entire tree
 */
export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
