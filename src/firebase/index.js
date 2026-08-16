export { app, auth, db } from './config';
export {
  getAuthErrorMessage,
  registerWithEmail,
  loginWithEmail,
  signInWithGoogle,
  logoutUser,
  sendPasswordReset,
  deleteAccount,
  subscribeToAuthState
} from './auth';
export {
  saveScan,
  getUserScans,
  subscribeToUserScans,
  getScanById,
  deleteScan,
  mapBackendScanToFirestoreDoc,
  getUserSettings,
  saveUserSettings,
  subscribeToUserSettings,
  submitUserFeedback
} from './firestore';
export { default } from './config';

