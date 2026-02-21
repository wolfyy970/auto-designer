import { useEffect } from 'react';

/** Ensures the .dark class is always present on <html>. */
export function useThemeEffect() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
}
