import { useState, useEffect } from 'react';

/** Counts seconds while `active` is true. Resets to 0 when deactivated. */
export function useElapsedTimer(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [active]);
  return elapsed;
}
