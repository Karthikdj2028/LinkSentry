import { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import {
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  subscribeToAuthState
} from '../firebase';

/**
 * Authentication Provider Component
 * Manages Firebase authentication state with browser session persistence
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes (login, logout, token refresh, page reload)
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
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

  const logout = async () => {
    return await logoutUser();
  };

  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
