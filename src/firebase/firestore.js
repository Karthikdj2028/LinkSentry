import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

/**
 * LinkSentry Cloud Firestore Scan-History Service
 * 
 * Target Structure:
 * users/{userId}/scans/{scanId}
 * 
 * Schema:
 * {
 *   userId: string,
 *   type: "url" | "qr" | "message",
 *   input: string,
 *   url: string,
 *   domain: string,
 *   verdict: string,
 *   riskScore: number,
 *   confidence: number,
 *   indicators: string[],
 *   engine: string,
 *   modelVersion: string,
 *   source: "web" | "android",
 *   createdAt: FieldValue (serverTimestamp)
 * }
 */

/**
 * Maps a raw backend scan response into the standardized Firestore scan document schema.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {string} input - Original input provided by the user
 * @param {object} backendResponse - Response JSON from FastAPI / detection engine
 * @param {string} [scanType='url'] - Scan vector type ('url', 'qr', 'message')
 * @returns {object} Standardized scan document payload ready for Firestore
 */
export function mapBackendScanToFirestoreDoc(userId, input, backendResponse = {}, scanType = 'url') {
  if (!userId) {
    throw new Error('userId (Firebase UID) is required to map scan document.');
  }

  const rawVerdict = typeof backendResponse.verdict === 'string' 
    ? backendResponse.verdict.toLowerCase() 
    : 'safe';

  // Extract embedded URL if present
  let extractedUrl = backendResponse.url || '';
  let extractedDomain = backendResponse.domain || '';

  if (scanType === 'message' && !extractedUrl && input) {
    const urlMatch = input.match(/https?:\/\/[^\s<>"]+/i);
    if (urlMatch) {
      extractedUrl = urlMatch[0];
      try {
        extractedDomain = new URL(extractedUrl).hostname;
      } catch {
        extractedDomain = '';
      }
    }
  } else if (scanType !== 'message' && !extractedUrl) {
    extractedUrl = input || '';
  }

  return {
    userId,
    type: scanType,
    input: input || backendResponse.message || backendResponse.url || '',
    url: extractedUrl,
    domain: extractedDomain,
    verdict: rawVerdict,
    riskScore: typeof backendResponse.risk_score === 'number' ? backendResponse.risk_score : 0,
    confidence: typeof backendResponse.confidence === 'number' ? backendResponse.confidence : 0.7,
    indicators: Array.isArray(backendResponse.indicators) ? backendResponse.indicators : [],
    engine: backendResponse.engine || (scanType === 'message' ? 'linksentry-message-heuristic-v1' : 'LinkSentry V3.3 URL ML Engine'),
    modelVersion: backendResponse.model_version || (scanType === 'message' ? 'v1.0' : 'V3.3'),
    source: 'web',
    createdAt: serverTimestamp()
  };
}

/**
 * Saves a completed scan record to the user's private scan history collection.
 * Path: users/{userId}/scans/{scanId}
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {object} scanData - Scan payload conforming to the scan document schema
 * @returns {Promise<{id: string, [key: string]: any}>} The created document reference and data
 */
export async function saveScan(userId, scanData) {
  if (!userId) {
    throw new Error('Cannot save scan: userId (Firebase UID) is required.');
  }

  console.log(`SCAN_PERSISTENCE_START uid=${userId} type=${scanData.type || scanData.scanType || 'url'}`);

  const scansCollectionRef = collection(db, 'users', userId, 'scans');

  // Sanitize createdAt for Cloud Firestore persistence.
  // If scanData.createdAt contains JavaScript functions (such as createLocalTimestamp() from local history),
  // override it with serverTimestamp() to ensure valid Firestore serialization.
  let validCreatedAt = serverTimestamp();
  if (scanData?.createdAt && typeof scanData.createdAt === 'object') {
    const hasFunctions = Object.values(scanData.createdAt).some((val) => typeof val === 'function');
    if (!hasFunctions && typeof scanData.createdAt.toMillis === 'function') {
      validCreatedAt = scanData.createdAt;
    }
  }

  const documentPayload = {
    userId,
    type: scanData.type || scanData.scanType || 'url',
    input: scanData.input || scanData.url || '',
    url: scanData.url || scanData.input || '',
    domain: scanData.domain || '',
    verdict: scanData.verdict || 'safe',
    riskScore: typeof scanData.riskScore === 'number' ? scanData.riskScore : (typeof scanData.risk_score === 'number' ? scanData.risk_score : 0),
    confidence: typeof scanData.confidence === 'number' ? scanData.confidence : 0.7,
    indicators: Array.isArray(scanData.indicators) ? scanData.indicators : [],
    engine: scanData.engine || 'LinkSentry V3.3 URL ML Engine',
    modelVersion: scanData.modelVersion || scanData.model_version || 'V3.3',
    source: scanData.source || 'web',
    createdAt: validCreatedAt
  };

  try {
    const docRef = await addDoc(scansCollectionRef, documentPayload);
    console.log(`SCAN_PERSISTENCE_SUCCESS uid=${userId} scanId=${docRef.id}`);

    return {
      id: docRef.id,
      ...documentPayload
    };
  } catch (err) {
    console.error(`SCAN_PERSISTENCE_FAILURE uid=${userId} error=`, err?.message || err);
    throw err;
  }
}

/**
 * Retrieves scan history records for a specific authenticated user.
 * Ordered by creation timestamp descending.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {number} [maxCount=50] - Maximum number of scan records to retrieve
 * @returns {Promise<Array<{id: string, [key: string]: any}>>} Array of scan records
 */
export async function getUserScans(userId, maxCount = 50) {
  if (!userId) {
    throw new Error('Cannot retrieve scans: userId (Firebase UID) is required.');
  }

  const scansCollectionRef = collection(db, 'users', userId, 'scans');
  const scansQuery = query(
    scansCollectionRef,
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  const querySnapshot = await getDocs(scansQuery);
  const scans = [];

  querySnapshot.forEach((docSnap) => {
    scans.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return scans;
}

/**
 * Subscribes to real-time updates for a user's scan history.
 * Automatically notifies when scans are added, updated, or deleted from Web or Android.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {function} onUpdate - Callback receiving array of scan records
 * @param {function} [onError] - Callback receiving any listener errors
 * @param {number} [maxCount=100] - Maximum number of scan records to subscribe to
 * @returns {function} Unsubscribe function to stop listening
 */
export function subscribeToUserScans(userId, onUpdate, onError, maxCount = 100) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const scansCollectionRef = collection(db, 'users', userId, 'scans');
  const scansQuery = query(
    scansCollectionRef,
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  return onSnapshot(
    scansQuery,
    (querySnapshot) => {
      const scans = [];
      querySnapshot.forEach((docSnap) => {
        scans.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      onUpdate(scans);
    },
    (err) => {
      console.error('Real-time scan subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Retrieves a single scan record by ID for an authenticated user.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {string} scanId - Firestore scan document ID
 * @returns {Promise<{id: string, [key: string]: any}|null>} Scan document or null if not found
 */
export async function getScanById(userId, scanId) {
  if (!userId || !scanId) {
    throw new Error('Both userId and scanId are required to retrieve a scan record.');
  }

  const scanDocRef = doc(db, 'users', userId, 'scans', scanId);
  const docSnap = await getDoc(scanDocRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data()
  };
}

/**
 * Deletes a single scan record by ID for an authenticated user.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {string} scanId - Firestore scan document ID
 * @returns {Promise<void>}
 */
export async function deleteScan(userId, scanId) {
  if (!userId || !scanId) {
    throw new Error('Both userId and scanId are required to delete a scan record.');
  }

  const scanDocRef = doc(db, 'users', userId, 'scans', scanId);
  await deleteDoc(scanDocRef);
}

/**
 * Retrieves the user's cross-platform preferences from Firestore.
 * Path: users/{userId}/settings/preferences
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @returns {Promise<object|null>} Settings document or null
 */
export async function getUserSettings(userId) {
  if (!userId) return null;
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'preferences');
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    console.error('Failed to get user settings from Firestore:', err);
    return null;
  }
}

/**
 * Saves or merges the user's cross-platform preferences in Firestore.
 * Path: users/{userId}/settings/preferences
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {object} settings - Settings object { theme, realTimeDetection, cloudSync, clipboardDetection, pushNotifications }
 * @returns {Promise<void>}
 */
export async function saveUserSettings(userId, settings) {
  if (!userId) return;
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(settingsDocRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save user settings to Firestore:', err);
  }
}

/**
 * Subscribes to real-time updates for a user's cross-platform preferences.
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {function} onUpdate - Callback with settings object
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserSettings(userId, onUpdate) {
  if (!userId) return () => {};
  const settingsDocRef = doc(db, 'users', userId, 'settings', 'preferences');
  return onSnapshot(settingsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data());
    }
  }, (err) => {
    console.error('Settings snapshot error:', err);
  });
}

/**
 * Submits user feedback / bug report to Firestore.
 * Path: users/{userId}/feedback/{feedbackId}
 * 
 * @param {string} userId - Authenticated user's Firebase UID
 * @param {object} feedbackData - { category, description, payload, email }
 * @returns {Promise<string>} Created feedback document ID
 */
export async function submitUserFeedback(userId, feedbackData) {
  if (!userId) throw new Error('User ID required to submit feedback');
  const feedbackColRef = collection(db, 'users', userId, 'feedback');
  const docRef = await addDoc(feedbackColRef, {
    ...feedbackData,
    userId,
    source: 'web',
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

