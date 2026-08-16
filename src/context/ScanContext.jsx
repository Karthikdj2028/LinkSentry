import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScanContext } from './scanContextInstance';
import { useAuth } from './useAuth';
import { useTheme } from './useTheme';
import { subscribeToUserScans, deleteScan as deleteFirestoreScan } from '../firebase';
import { getLocalScans, deleteLocalScan, mergeScans } from '../utils/localHistory';

export function ScanProvider({ children }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { securityPreferences } = useTheme();

  const userId = currentUser?.uid;
  const isCloudSyncOff = securityPreferences?.cloudSync === false;

  const [remoteScans, setRemoteScans] = useState([]);
  const [localScans, setLocalScans] = useState(() => getLocalScans(userId || 'anonymous'));
  const [scansLoading, setScansLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Sync local scans whenever userId changes
  const refreshLocalScans = useCallback(() => {
    const currentLocal = getLocalScans(userId || 'anonymous');
    setLocalScans(currentLocal);
  }, [userId]);

  // 2. Listen for local scan updates dispatched by scanners across open tabs
  useEffect(() => {
    const handleLocalUpdate = () => {
      refreshLocalScans();
    };

    window.addEventListener('linksentry:local_scans_updated', handleLocalUpdate);
    return () => window.removeEventListener('linksentry:local_scans_updated', handleLocalUpdate);
  }, [refreshLocalScans]);

  // 3. Single centralized real-time Firestore listener for all views
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId || isCloudSyncOff) {
      // Async state update in effect callback
      const timer = setTimeout(() => {
        setRemoteScans([]);
        setScansLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const unsubscribe = subscribeToUserScans(
      userId,
      (liveScans) => {
        setRemoteScans(liveScans || []);
        setError('');
        setScansLoading(false);
      },
      (err) => {
        console.error('Failed to stream scans from Firestore:', err);
        setError('Cloud telemetry unavailable. Showing local scan statistics.');
        setScansLoading(false);
      },
      100
    );

    return () => {
      unsubscribe();
    };
  }, [userId, isCloudSyncOff, authLoading]);

  // 4. Compute stable unified scans array
  const scans = useMemo(() => {
    return mergeScans(remoteScans, localScans);
  }, [remoteScans, localScans]);

  // 5. Unified scan deletion handler (Local + Firestore)
  const removeScan = useCallback(async (scanId) => {
    if (!scanId) return;

    // Remove locally
    deleteLocalScan(userId || 'anonymous', scanId);
    setLocalScans((prev) => prev.filter((s) => s.id !== scanId));

    // Remove from Firestore if remote record
    if (userId && !scanId.startsWith('local_') && !isCloudSyncOff) {
      try {
        await deleteFirestoreScan(userId, scanId);
        setRemoteScans((prev) => prev.filter((s) => s.id !== scanId));
      } catch (err) {
        console.error('Failed to delete remote scan:', err);
        throw err;
      }
    }
  }, [userId, isCloudSyncOff]);

  const value = {
    scans,
    remoteScans,
    localScans,
    loading: authLoading || scansLoading,
    error,
    refreshLocalScans,
    removeScan
  };

  return (
    <ScanContext.Provider value={value}>
      {children}
    </ScanContext.Provider>
  );
}

export default ScanProvider;
