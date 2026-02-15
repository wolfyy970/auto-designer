import { useState, useEffect } from 'react';
import { loadCode } from '../services/idb-storage';

/**
 * Load generated code from IndexedDB for a given result ID.
 * Returns undefined while loading — consumers should show loading state.
 */
export function useResultCode(resultId: string | undefined): {
  code: string | undefined;
  isLoading: boolean;
} {
  const [code, setCode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!resultId) {
      setCode(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadCode(resultId).then((c) => {
      if (!cancelled) {
        setCode(c);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  return { code, isLoading };
}
