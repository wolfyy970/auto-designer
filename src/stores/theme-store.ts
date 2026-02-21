import { create } from 'zustand';

interface ThemeStore {
  mode: 'dark';
}

export type ThemeMode = 'dark';

export const useThemeStore = create<ThemeStore>()(() => ({
  mode: 'dark' as const,
}));
