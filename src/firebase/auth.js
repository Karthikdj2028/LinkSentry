import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './config';

/**
 * Maps Firebase Authentication error codes to user-friendly messages.
 * Prevents exposing raw technical errors and confusing error strings.
 */
export function getAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  const code = typeof error === 'string' ? error : error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address format (e.g., analyst@domain.com).';
    case 'auth/user-disabled':
      return 'This analyst account has been suspended. Please contact your SOC administrator.';
    case 'auth/too-many-requests':
      return 'Access temporarily locked due to multiple failed attempts. Please try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network communication failed. Please check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled for this project.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion.';
    default:
      return error.message || 'Authentication failed. Please check your credentials and try again.';
  }
}

/**
 * Register a new user with Email and Password
 */
export async function registerWithEmail(email, password) {
  return await createUserWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Sign in an existing user with Email and Password
 */
export async function loginWithEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Sign out the currently authenticated user
 */
export async function logoutUser() {
  return await signOut(auth);
}

/**
 * Subscribe to Firebase authentication state changes
 */
export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
