/**
 * IndexedDB storage for heavy data (generated code, provenance snapshots).
 * Uses idb-keyval for a simple key-value API over IndexedDB.
 *
 * Separate databases keep code and provenance isolated for independent GC.
 */
import { createStore, get, set, del, keys, clear } from 'idb-keyval';
import type { Provenance } from '../types/provider';
import { STORAGE_KEYS } from '../lib/storage-keys';

const codeStore = createStore(STORAGE_KEYS.IDB_CODE, 'code');
const provenanceStore = createStore(STORAGE_KEYS.IDB_PROVENANCE, 'provenance');

// ── Generated code ────────────────────────────────────────────────────

export function saveCode(resultId: string, code: string): Promise<void> {
  return set(resultId, code, codeStore);
}

export function loadCode(resultId: string): Promise<string | undefined> {
  return get(resultId, codeStore);
}

export function deleteCode(resultId: string): Promise<void> {
  return del(resultId, codeStore);
}

export function clearAllCodes(): Promise<void> {
  return clear(codeStore);
}

export async function getCodeKeys(): Promise<string[]> {
  return (await keys(codeStore)) as string[];
}

// ── Provenance snapshots ──────────────────────────────────────────────

export function saveProvenance(
  resultId: string,
  provenance: Provenance,
): Promise<void> {
  return set(resultId, provenance, provenanceStore);
}

export function deleteProvenance(resultId: string): Promise<void> {
  return del(resultId, provenanceStore);
}

// ── Garbage collection ────────────────────────────────────────────────

/** Delete IndexedDB entries whose keys aren't in the active set. */
export async function garbageCollect(
  activeResultIds: Set<string>,
): Promise<{ codesRemoved: number; provenanceRemoved: number }> {
  let codesRemoved = 0;
  let provenanceRemoved = 0;

  const codeKeys = await getCodeKeys();
  for (const key of codeKeys) {
    if (!activeResultIds.has(key as string)) {
      await del(key, codeStore);
      codesRemoved++;
    }
  }

  const provKeys = (await keys(provenanceStore)) as string[];
  for (const key of provKeys) {
    if (!activeResultIds.has(key as string)) {
      await del(key, provenanceStore);
      provenanceRemoved++;
    }
  }

  return { codesRemoved, provenanceRemoved };
}
