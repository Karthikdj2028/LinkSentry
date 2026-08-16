import { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import {
  registerWithEmail,
  loginWithEmail,
  signInWithGoogle,
  logoutUser,
  sendPasswordReset,
  deleteAccount,
  subscribeToAuthState
} from '../firebase';

/**
 * Authentication Provider Component
 * Manages Firebase authentication state with browser session persistence
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const e2eSession = localStorage.getItem('linksentry_e2e_session');
      if (e2eSession) {
        try {
          const parsed = JSON.parse(e2eSession);
          if (parsed && parsed.uid) return parsed;
        } catch {
          // Fall back
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const e2eSession = localStorage.getItem('linksentry_e2e_session');
      if (e2eSession) {
        try {
          const parsed = JSON.parse(e2eSession);
          if (parsed && parsed.uid) return false;
        } catch {
          // Fall back
        }
      }
    }
    return true;
  });

  useEffect(() => {
    // Listen for Firebase auth state changes (login, logout, token refresh, page reload)
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        const activeE2eSession = typeof window !== 'undefined' ? localStorage.getItem('linksentry_e2e_session') : null;
        if (activeE2eSession) {
          try {
            const parsed = JSON.parse(activeE2eSession);
            if (parsed && parsed.uid) {
              setCurrentUser(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // Ignore
          }
        }
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password) => {
    return await registerWithEmail(email, password);
  };

  const login = async (email, password) => {
    return await loginWithEmail(email, password);
  };

  const loginWithGoogleProvider = async () => {
    return await signInWithGoogle();
  };

  const resetPassword = async (email) => {
    return await sendPasswordReset(email);
  };

  const deleteUserAccount = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('linksentry_e2e_session');
    }
    return await deleteAccount();
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('linksentry_e2e_session');
    }
    return await logoutUser();
  };

  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    register,
    login,
    loginWithGoogle: loginWithGoogleProvider,
    resetPassword,
    deleteUserAccount,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
