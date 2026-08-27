import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeContext } from './themeContextInstance';
import { useAuth } from './useAuth';
import { saveUserSettings, subscribeToUserSettings } from '../firebase';

export function ThemeProvider({ children }) {
  const { currentUser } = useAuth();

  // Track recent local user intent timestamps to prevent stale Firestore snapshots from reverting local actions
  const lastUserThemeChangeRef = useRef(0);
  const lastUserPrefChangeRef = useRef(0);

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
      threatSharing: true,
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

  // Sync settings with Firestore for authenticated user via real-time subscription
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;

    const unsubscribe = subscribeToUserSettings(currentUser.uid, (remoteSettings) => {
      if (!remoteSettings) return;

      // Check if user recently explicitly changed theme locally
      const isRecentThemeChange = Date.now() - lastUserThemeChangeRef.current < 5000;
      if (!isRecentThemeChange && remoteSettings.theme) {
        if (remoteSettings.theme === 'system' || remoteSettings.theme === 'light' || remoteSettings.theme === 'dark') {
          setThemeState(remoteSettings.theme);
          localStorage.setItem('linksentry_theme', remoteSettings.theme);
        }
      }

      // Check if user recently explicitly toggled preferences locally
      const isRecentPrefChange = Date.now() - lastUserPrefChangeRef.current < 5000;
      if (!isRecentPrefChange) {
        setSecurityPreferences((prev) => {
          const merged = {
            ...prev,
            realTimeDetection: true, // System enforced
            cloudSync: remoteSettings.cloudSync !== undefined ? remoteSettings.cloudSync : prev.cloudSync,
            threatSharing: remoteSettings.threatSharing !== undefined ? remoteSettings.threatSharing : prev.threatSharing,
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

  // Set theme handler with immediate DOM application & local timestamp lock
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'system' && newTheme !== 'light' && newTheme !== 'dark') return;

    lastUserThemeChangeRef.current = Date.now();
    setThemeState(newTheme);
    localStorage.setItem('linksentry_theme', newTheme);

    const isLight = newTheme === 'system' ? systemIsLight : newTheme === 'light';
    const targetResolved = isLight ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', targetResolved);
      root.style.colorScheme = targetResolved;
    }

    if (currentUser && currentUser.uid) {
      saveUserSettings(currentUser.uid, { theme: newTheme }).catch((err) => {
        console.warn('[LinkSentry] Firestore theme save notice:', err?.message || err);
      });
    }
  }, [currentUser, systemIsLight]);

  // Update a single security preference with local timestamp lock
  const updateSecurityPreference = useCallback((key, value) => {
    lastUserPrefChangeRef.current = Date.now();

    setSecurityPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      // Enforce realTimeDetection
      updated.realTimeDetection = true;

      localStorage.setItem('linksentry_security_prefs', JSON.stringify(updated));

      if (currentUser && currentUser.uid) {
        saveUserSettings(currentUser.uid, { [key]: value }).catch((err) => {
          console.warn('[LinkSentry] Firestore pref save notice:', err?.message || err);
        });
      }

      // Handle browser permissions if enabling pushNotifications
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
