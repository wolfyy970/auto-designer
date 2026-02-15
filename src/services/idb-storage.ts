/**
 * IndexedDB storage for heavy data (generated code, provenance snapshots).
 * Uses idb-keyval for a simple key-value API over IndexedDB.
 *
 * Separate databases keep code and provenance isolated for independent GC.
 */
import { createStore, get, set, del, keys, getMany, clear } from 'idb-keyval';
import type { Provenance } from '../types/provider';

const codeStore = createStore('auto-designer-code', 'code');
const provenanceStore = createStore('auto-designer-provenance', 'provenance');

// ── Generated code ────────────────────────────────────────────────────

export function saveCode(resultId: string, code: string): Promise<void> {
  return set(resultId, code, codeStore);
}

export function loadCode(resultId: string): Promise<string | undefined> {
  return get(resultId, codeStore);
}

export async function loadManyCodes(
  resultIds: string[],
): Promise<Map<string, string>> {
  const values = await getMany(resultIds, codeStore);
  const map = new Map<string, string>();
  resultIds.forEach((id, i) => {
    if (values[i] != null) map.set(id, values[i] as string);
  });
  return map;
}

export function deleteCode(resultId: string): Promise<void> {
  return del(resultId, codeStore);
}

export async function deleteManyCodes(resultIds: string[]): Promise<void> {
  await Promise.all(resultIds.map((id) => del(id, codeStore)));
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

export function loadProvenance(
  resultId: string,
): Promise<Provenance | undefined> {
  return get(resultId, provenanceStore);
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
