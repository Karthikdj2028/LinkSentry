import { useContext } from 'react';
import { ScanContext } from './scanContextInstance';

export function useScans() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScans must be used within a ScanProvider');
  }
  return context;
}

export default useScans;
