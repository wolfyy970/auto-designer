/**
 * One-time migration: move generated code from localStorage to IndexedDB.
 *
 * Runs on app startup. Checks a flag to avoid re-running.
 * After migration, generated code is stored in IndexedDB and
 * stripped from the localStorage-persisted generation store.
 */
import { saveCode } from './idb-storage';
import { STORAGE_KEYS } from '../lib/storage-keys';

const MIGRATION_FLAG = STORAGE_KEYS.MIGRATION_FLAG;
const GENERATION_STORE_KEY = STORAGE_KEYS.GENERATION;

interface PersistedResult {
  id: string;
  code?: string;
  runId?: string;
  runNumber?: number;
  [key: string]: unknown;
}

export async function migrateToIndexedDB(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  try {
    const raw = localStorage.getItem(GENERATION_STORE_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }

    const parsed = JSON.parse(raw);
    // Zustand persist wraps state in { state: ..., version: ... }
    const state = parsed?.state;
    if (!state?.results || !Array.isArray(state.results)) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }

    const results = state.results as PersistedResult[];
    let migrated = 0;

    for (const result of results) {
      // Save code to IndexedDB if present
      if (result.code) {
        await saveCode(result.id, result.code);
        delete result.code;
        migrated++;
      }

      // Backfill run tracking fields
      if (!result.runId) result.runId = 'legacy';
      if (!result.runNumber) result.runNumber = 1;
    }

    // Ensure selectedVersions exists
    if (!state.selectedVersions) {
      state.selectedVersions = {};
    }

    // Write updated state back (code stripped)
    localStorage.setItem(GENERATION_STORE_KEY, JSON.stringify(parsed));
    localStorage.setItem(MIGRATION_FLAG, '1');

    if (import.meta.env.DEV && migrated > 0) {
      console.log(`[migration] Moved code for ${migrated} result(s) to IndexedDB`);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[migration] Failed to migrate to IndexedDB:', err);
    }
    // Set flag anyway to avoid retrying a broken migration
    localStorage.setItem(MIGRATION_FLAG, '1');
  }
}
