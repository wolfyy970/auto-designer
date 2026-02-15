/**
 * Central registry of all localStorage / IndexedDB key names.
 * Prevents typos and makes it easy to find all persisted state.
 */
export const STORAGE_KEYS = {
  // localStorage (Zustand persist)
  ACTIVE_SPEC: 'auto-designer-active-spec',
  CANVAS: 'auto-designer-canvas',
  COMPILER: 'auto-designer-compiler',
  GENERATION: 'auto-designer-generation',
  PROMPTS: 'auto-designer-prompts',
  THEME: 'auto-designer-theme',

  // localStorage (manual)
  SPECS: 'auto-designer-specs',
  API_KEYS: 'auto-designer-api-keys',
  MIGRATION_FLAG: 'auto-designer-migrated-idb',

  // IndexedDB store names
  IDB_CODE: 'auto-designer-code',
  IDB_PROVENANCE: 'auto-designer-provenance',
} as const;
