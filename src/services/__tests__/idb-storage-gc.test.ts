// Real IndexedDB semantics via fake-indexeddb. Covers the canvas-snapshot DB's versioned
// opener: it must self-heal a DB poisoned with a `files` store (the legacy bug) and round-trip
// save/load/delete/GC. (The store is owned directly, not through idb-keyval.)
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  saveCanvasSnapshot,
  loadCanvasSnapshot,
  deleteCanvasSnapshot,
  garbageCollectCanvasSnapshots,
} from '../idb-storage';
import type { SavedCanvasSnapshot } from '../../types/saved-canvas';

const snap = (id: string): SavedCanvasSnapshot =>
  ({ schemaVersion: 1, savedAt: 't', spec: { id, title: id } } as unknown as SavedCanvasSnapshot);

describe('canvas-snapshot store (versioned opener)', () => {
  it('self-heals a DB poisoned with a "files" store and round-trips a snapshot', async () => {
    // Pre-create the poisoned DB exactly like the legacy migration bug, BEFORE the module opens it.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('auto-designer-canvas-snapshots', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    });

    await saveCanvasSnapshot('a', snap('a'));
    expect((await loadCanvasSnapshot('a'))?.spec.id).toBe('a');
  });

  it('deletes a snapshot', async () => {
    await saveCanvasSnapshot('b', snap('b'));
    expect(await loadCanvasSnapshot('b')).toBeDefined();
    await deleteCanvasSnapshot('b');
    expect(await loadCanvasSnapshot('b')).toBeUndefined();
  });

  it('garbage-collects snapshot ids not in the active set, keeps the active ones', async () => {
    await saveCanvasSnapshot('keep', snap('keep'));
    await saveCanvasSnapshot('drop', snap('drop'));

    await garbageCollectCanvasSnapshots(new Set(['keep']));

    expect(await loadCanvasSnapshot('keep')).toBeDefined();
    expect(await loadCanvasSnapshot('drop')).toBeUndefined();
  });
});
