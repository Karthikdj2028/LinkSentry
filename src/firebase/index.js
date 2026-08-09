export { app, auth, db } from './config';
export {
  getAuthErrorMessage,
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  subscribeToAuthState
} from './auth';
export {
  saveScan,
  getUserScans,
  getScanById,
  deleteScan,
  mapBackendScanToFirestoreDoc
} from './firestore';
export { default } from './config';
