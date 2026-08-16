import { useState, useEffect, useCallback } from 'react';
import { ThemeContext } from './themeContextInstance';
import { useAuth } from './useAuth';
import { getUserSettings, saveUserSettings, subscribeToUserSettings } from '../firebase';

export function ThemeProvider({ children }) {
  const { currentUser } = useAuth();

  // 1. Theme State ('system' | 'light' | 'dark')
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('linksentry_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    }
    return 'system';
  });

  // 2. System theme preference state
  const [systemIsLight, setSystemIsLight] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return false;
  });

  // Computed Resolved Theme ('light' | 'dark')
  const resolvedTheme = theme === 'system' ? (systemIsLight ? 'light' : 'dark') : theme;

  // 3. Security Preferences State
  const [securityPreferences, setSecurityPreferences] = useState(() => {
    const defaultPrefs = {
      realTimeDetection: true,
      cloudSync: true,
      clipboardDetection: false,
      pushNotifications: true
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('linksentry_security_prefs');
        if (saved) {
          return { ...defaultPrefs, ...JSON.parse(saved) };
        }
      } catch {
        // Fallback to default
      }
    }
    return defaultPrefs;
  });

  // Apply data-theme attribute to html root whenever resolvedTheme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // System media query change listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e) => {
      setSystemIsLight(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Sync settings with Firestore for authenticated user
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;

    // Load initial settings from Firestore
    getUserSettings(currentUser.uid).then((remoteSettings) => {
      if (remoteSettings) {
        if (remoteSettings.theme && (remoteSettings.theme === 'system' || remoteSettings.theme === 'light' || remoteSettings.theme === 'dark')) {
          setThemeState(remoteSettings.theme);
          localStorage.setItem('linksentry_theme', remoteSettings.theme);
        }
        setSecurityPreferences((prev) => {
          const merged = {
            realTimeDetection: remoteSettings.realTimeDetection !== undefined ? remoteSettings.realTimeDetection : prev.realTimeDetection,
            cloudSync: remoteSettings.cloudSync !== undefined ? remoteSettings.cloudSync : prev.cloudSync,
            clipboardDetection: remoteSettings.clipboardDetection !== undefined ? remoteSettings.clipboardDetection : prev.clipboardDetection,
            pushNotifications: remoteSettings.pushNotifications !== undefined ? remoteSettings.pushNotifications : prev.pushNotifications
          };
          localStorage.setItem('linksentry_security_prefs', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.error);

    // Subscribe to real-time updates across devices
    const unsubscribe = subscribeToUserSettings(currentUser.uid, (remoteSettings) => {
      if (remoteSettings) {
        if (remoteSettings.theme) {
          setThemeState(remoteSettings.theme);
          localStorage.setItem('linksentry_theme', remoteSettings.theme);
        }
        setSecurityPreferences((prev) => {
          const merged = {
            realTimeDetection: remoteSettings.realTimeDetection !== undefined ? remoteSettings.realTimeDetection : prev.realTimeDetection,
            cloudSync: remoteSettings.cloudSync !== undefined ? remoteSettings.cloudSync : prev.cloudSync,
            clipboardDetection: remoteSettings.clipboardDetection !== undefined ? remoteSettings.clipboardDetection : prev.clipboardDetection,
            pushNotifications: remoteSettings.pushNotifications !== undefined ? remoteSettings.pushNotifications : prev.pushNotifications
          };
          localStorage.setItem('linksentry_security_prefs', JSON.stringify(merged));
          return merged;
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser]);

  // Set theme handler
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'system' && newTheme !== 'light' && newTheme !== 'dark') return;
    setThemeState(newTheme);
    localStorage.setItem('linksentry_theme', newTheme);

    if (currentUser && currentUser.uid) {
      saveUserSettings(currentUser.uid, { theme: newTheme }).catch(console.error);
    }
  }, [currentUser]);

  // Update a single security preference
  const updateSecurityPreference = useCallback((key, value) => {
    setSecurityPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('linksentry_security_prefs', JSON.stringify(updated));

      if (currentUser && currentUser.uid) {
        saveUserSettings(currentUser.uid, { [key]: value }).catch(console.error);
      }

      // Handle browser permissions if enabling specific features
      if (key === 'pushNotifications' && value === true && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      return updated;
    });
  }, [currentUser]);

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    securityPreferences,
    updateSecurityPreference
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
