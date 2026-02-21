import { create } from 'zustand';

interface ThemeStore {
  mode: 'dark';
}

export const useThemeStore = create<ThemeStore>()(() => ({
  mode: 'dark' as const,
}));
