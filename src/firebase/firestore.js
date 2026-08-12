import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

/**
 * LinkSentry Cloud Firestore Scan-History Service (Stage 3 Foundation)
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

  const scansCollectionRef = collection(db, 'users', userId, 'scans');

  const documentPayload = {
    userId,
    type: scanData.type || 'url',
    input: scanData.input || scanData.url || '',
    url: scanData.url || scanData.input || '',
    domain: scanData.domain || '',
    verdict: scanData.verdict || 'safe',
    riskScore: typeof scanData.riskScore === 'number' ? scanData.riskScore : (typeof scanData.risk_score === 'number' ? scanData.risk_score : 0),
    confidence: typeof scanData.confidence === 'number' ? scanData.confidence : 0.7,
    indicators: Array.isArray(scanData.indicators) ? scanData.indicators : [],
    engine: scanData.engine || 'temporary-rule-based-detector',
    createdAt: scanData.createdAt || serverTimestamp()
  };

  const docRef = await addDoc(scansCollectionRef, documentPayload);

  return {
    id: docRef.id,
    ...documentPayload
  };
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
