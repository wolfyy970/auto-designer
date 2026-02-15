import { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

/** Applies or removes the `.dark` class on `<html>` based on theme preference. */
export function useThemeEffect() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    function apply() {
      const isDark =
        mode === 'dark' ||
        (mode === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }

    apply();

    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
}
