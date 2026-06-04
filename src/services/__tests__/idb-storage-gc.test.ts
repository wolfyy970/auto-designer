import { describe, it, expect, beforeEach, vi } from 'vitest';

// idb-keyval is mocked: createStore returns an opaque sentinel; keys/del are observed.
const m = vi.hoisted(() => ({ keys: vi.fn(), del: vi.fn() }));

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn(),
  set: vi.fn(),
  del: m.del,
  keys: m.keys,
  clear: vi.fn(),
}));

import { garbageCollectCanvasSnapshots } from '../idb-storage';

describe('garbageCollectCanvasSnapshots', () => {
  beforeEach(() => {
    m.keys.mockReset();
    m.del.mockReset().mockResolvedValue(undefined);
  });

  it('deletes snapshot keys that are not in the active set', async () => {
    m.keys.mockResolvedValue(['keep-1', 'orphan', 'keep-2']);

    const removed = await garbageCollectCanvasSnapshots(new Set(['keep-1', 'keep-2']));

    expect(removed).toBe(1);
    expect(m.del).toHaveBeenCalledTimes(1);
    expect(m.del).toHaveBeenCalledWith('orphan', expect.anything());
  });

  it('keeps every snapshot when all keys are active', async () => {
    m.keys.mockResolvedValue(['a', 'b']);

    const removed = await garbageCollectCanvasSnapshots(new Set(['a', 'b']));

    expect(removed).toBe(0);
    expect(m.del).not.toHaveBeenCalled();
  });

  it('is a no-op on an empty store', async () => {
    m.keys.mockResolvedValue([]);

    const removed = await garbageCollectCanvasSnapshots(new Set(['a']));

    expect(removed).toBe(0);
    expect(m.del).not.toHaveBeenCalled();
  });
});
