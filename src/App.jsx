import { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

/**
 * LinkSentry Main Application - Stage 1 Frontend Architecture
 * 
 * Manages main navigation tabs:
 * - Home
 * - Scanner (with subtabs: URL, QR, Message)
 * - History
 * - Dashboard
 * - Profile
 * 
 * TODO: In Stage 2, add Firebase Auth state listener, Firestore real-time sync, and protected route handlers
 */
function App() {
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

  return (
    <div className="app-layout">
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

export default App;
