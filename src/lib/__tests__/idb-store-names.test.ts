import { describe, expect, it } from 'vitest';
import { IDB_DATABASE_KEY_NAMES, IDB_STORE_NAMES } from '../storage-keys';

describe('IDB_STORE_NAMES', () => {
  it('declares a store name for every IndexedDB database', () => {
    for (const name of IDB_DATABASE_KEY_NAMES) {
      expect(IDB_STORE_NAMES[name], `missing store name for ${name}`).toBeTruthy();
    }
  });

  it('maps canvas snapshots to the `snapshots` store', () => {
    // Regression: the legacy-prefix migration once fell through to `files`, creating the
    // canvas-snapshots DB without a `snapshots` store and breaking every canvas-manager action.
    expect(IDB_STORE_NAMES.IDB_CANVAS_SNAPSHOTS).toBe('snapshots');
  });
});
