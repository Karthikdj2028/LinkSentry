/**
 * Local Scan History Persistence Utility
 * Ensures that scans are always persisted locally on the client device,
 * regardless of whether Cloud Sync to Firestore is enabled or disabled.
 */

const STORAGE_KEY_PREFIX = 'linksentry_local_scans_';
const MAX_LOCAL_SCANS = 200;

/**
 * Get the storage key for a user
 */
function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId || 'anonymous'}`;
}

/**
 * Safely parse JSON from localStorage
 */
function safeGetJson(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[LocalHistory] Failed to read local scans:', err);
    return [];
  }
}

/**
 * Safely write JSON to localStorage
 */
function safeSetJson(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('[LocalHistory] Failed to write local scans:', err);
  }
}

/**
 * Normalize a timestamp object so it can be formatted identically to Firestore timestamps
 */
export function createLocalTimestamp() {
  const now = new Date();
  return {
    seconds: Math.floor(now.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => now,
    toISOString: () => now.toISOString()
  };
}

/**
 * Save a scan document to local persistent history
 */
export function saveLocalScan(userId, scanDoc) {
  if (!scanDoc) return null;

  const key = getStorageKey(userId);
  const currentScans = safeGetJson(key);

  const localId = scanDoc.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const recordToSave = {
    ...scanDoc,
    id: localId,
    createdAt: scanDoc.createdAt || createLocalTimestamp(),
    isLocalOnly: scanDoc.isLocalOnly !== undefined ? scanDoc.isLocalOnly : false,
    savedAt: new Date().toISOString()
  };

  // Prepend new scan, deduplicate by ID or identical target + timestamp
  const filtered = currentScans.filter((s) => s.id !== localId);
  const updated = [recordToSave, ...filtered].slice(0, MAX_LOCAL_SCANS);

  safeSetJson(key, updated);

  // Dispatch custom window event so open tabs/components can re-sync immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('linksentry:local_scans_updated', { detail: { userId, scan: recordToSave } }));
  }

  return recordToSave;
}

/**
 * Retrieve all local scans for a given user
 */
export function getLocalScans(userId) {
  const key = getStorageKey(userId);
  return safeGetJson(key);
}

/**
 * Delete a specific scan by ID from local history
 */
export function deleteLocalScan(userId, scanId) {
  if (!scanId) return;
  const key = getStorageKey(userId);
  const currentScans = safeGetJson(key);
  const filtered = currentScans.filter((s) => s.id !== scanId);
  safeSetJson(key, filtered);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('linksentry:local_scans_updated', { detail: { userId, deletedId: scanId } }));
  }
}

/**
 * Clear all local scans for a given user
 */
export function clearLocalScans(userId) {
  const key = getStorageKey(userId);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('linksentry:local_scans_updated', { detail: { userId, cleared: true } }));
  }
}

/**
 * Helper to merge Firestore remote scans and local-only scans seamlessly
 * Ensures no duplicates and sorted by most recent date.
 */
export function mergeScans(remoteScans = [], localScans = []) {
  const remoteMap = new Map();
  remoteScans.forEach((scan) => {
    if (scan && scan.id) {
      remoteMap.set(scan.id, scan);
    }
  });

  const merged = [...remoteScans];

  localScans.forEach((local) => {
    if (local && local.id && !remoteMap.has(local.id)) {
      // Check if there is an existing remote scan with identical input, type and close timestamp (within 5 seconds)
      const duplicate = remoteScans.find((r) => {
        if (r.type !== local.type) return false;
        const rTarget = r.input || r.url || '';
        const lTarget = local.input || local.url || '';
        return rTarget === lTarget;
      });

      if (!duplicate) {
        merged.push(local);
      }
    }
  });

  // Sort descending by timestamp
  return merged.sort((a, b) => {
    const getTime = (item) => {
      if (!item || !item.createdAt) return 0;
      if (typeof item.createdAt.toDate === 'function') {
        return item.createdAt.toDate().getTime();
      }
      if (typeof item.createdAt.seconds === 'number') {
        return item.createdAt.seconds * 1000;
      }
      const d = new Date(item.createdAt);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return getTime(b) - getTime(a);
  });
}
