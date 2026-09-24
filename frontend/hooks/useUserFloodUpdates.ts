import { useContext } from 'react';
import { FloodUpdatesContext } from '../context/FloodUpdatesContext';

export function useUserFloodUpdates() {
  const context = useContext(FloodUpdatesContext);
  if (!context) {
    throw new Error('useUserFloodUpdates must be used within a FloodUpdatesProvider');
  }
  return context;
}
