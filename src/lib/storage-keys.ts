/**
 * Central registry of all localStorage / IndexedDB key names.
 * Prevents typos and makes it easy to find all persisted state.
 */
export const STORAGE_KEYS = {
  // localStorage (Zustand persist)
  ACTIVE_CANVAS: 'auto-designer-active-canvas',
  CANVAS: 'auto-designer-canvas',
  WORKSPACE_DOMAIN: 'auto-designer-workspace-domain',
  INCUBATOR: 'auto-designer-incubator',
  GENERATION: 'auto-designer-generation',
  PROMPTS: 'auto-designer-prompts',
  EVALUATOR_DEFAULTS: 'auto-designer-evaluator-defaults',
  THINKING_DEFAULTS: 'auto-designer-thinking-defaults',

  // localStorage (manual)
  /** User dismissed the optional-input tip on the canvas (string value is legacy; stable across renames). */
  CANVAS_OPTIONAL_INPUTS_TIP_DISMISSED: 'auto-designer-canvas-optional-sections-tip-dismissed',
  /** Set once the Model-node → Settings migration has run for this user. */
  MODEL_NODE_TO_SETTINGS_MIGRATION_DONE: 'auto-designer-model-node-migration-done',
  CANVASES: 'auto-designer-canvases',
  MIGRATION_FLAG: 'auto-designer-migrated-idb',

  // IndexedDB database names (idb-keyval)
  IDB_CODE: 'auto-designer-code',
  IDB_PROVENANCE: 'auto-designer-provenance',
  IDB_FILES: 'auto-designer-files',
  IDB_CANVAS_SNAPSHOTS: 'auto-designer-canvas-snapshots',
} as const;

/** Value stored under `STORAGE_KEYS.CANVAS_OPTIONAL_INPUTS_TIP_DISMISSED` when the tip is dismissed. */
export const CANVAS_OPTIONAL_INPUTS_TIP_DISMISSED_VALUE = '1';

/** Canonical "set" sentinel for boolean-style localStorage flags (one-shot migrations, dismissals, etc.). */
export const STORAGE_FLAG_SET = '1';

/**
 * Mark a localStorage flag as set. Returns false in non-browser contexts
 * or if the underlying setItem fails (Safari private mode, quota exceeded,
 * etc.). Callers may treat the false return as "this run is best-effort
 * and the flag may not have stuck" — re-running the action is expected
 * to be idempotent.
 */
export function markStorageFlag(key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, STORAGE_FLAG_SET);
    return true;
  } catch {
    return false;
  }
}

/** Read a localStorage flag as a boolean. Safe in non-browser contexts (returns false). */
export function isStorageFlagSet(key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(key) === STORAGE_FLAG_SET;
  } catch {
    return false;
  }
}

/** Keys backed by localStorage (not IndexedDB DB names). Used by branding migration. */
export const PERSISTED_LOCAL_STORAGE_KEY_NAMES = [
  'ACTIVE_CANVAS',
  'CANVAS',
  'WORKSPACE_DOMAIN',
  'INCUBATOR',
  'GENERATION',
  'PROMPTS',
  'EVALUATOR_DEFAULTS',
  'THINKING_DEFAULTS',
  'CANVASES',
  'MIGRATION_FLAG',
] as const satisfies ReadonlyArray<keyof typeof STORAGE_KEYS>;

export const IDB_DATABASE_KEY_NAMES = [
  'IDB_CODE',
  'IDB_PROVENANCE',
  'IDB_FILES',
  'IDB_CANVAS_SNAPSHOTS',
] as const satisfies ReadonlyArray<keyof typeof STORAGE_KEYS>;

/**
 * The single idb-keyval object-store name inside each IndexedDB database above.
 * Single source of truth shared by idb-storage and the legacy-prefix migration —
 * `satisfies Record<…>` forces every database to declare its store name, so a new
 * database can't silently fall through to the wrong store (the bug that left the
 * canvas-snapshots DB with a `files` store and no `snapshots` store).
 */
export const IDB_STORE_NAMES = {
  IDB_CODE: 'code',
  IDB_PROVENANCE: 'provenance',
  IDB_FILES: 'files',
  IDB_CANVAS_SNAPSHOTS: 'snapshots',
} as const satisfies Record<(typeof IDB_DATABASE_KEY_NAMES)[number], string>;
