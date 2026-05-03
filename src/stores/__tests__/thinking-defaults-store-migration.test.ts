/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from '../../lib/storage-keys';

async function importStoreFresh(): Promise<typeof import('../thinking-defaults-store')> {
  // Drop the module cache so persist's hydrate runs against the current
  // localStorage value. Each test seeds its own v1 blob first.
  vi.resetModules();
  return import('../thinking-defaults-store');
}

describe('thinking-defaults-store v1 → v2 migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('copies the legacy `inputs` override into all three input-section slots', async () => {
    const v1Persisted = {
      state: {
        overrides: {
          design: {},
          incubate: {},
          'internal-context': {},
          inputs: { level: 'high', budgetTokens: 12_000 },
          'design-system': {},
          evaluator: {},
        },
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v1Persisted));

    const { useThinkingDefaultsStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useThinkingDefaultsStore.getState().overrides;

    expect(overrides['inputs-research']).toEqual({ level: 'high', budgetTokens: 12_000 });
    expect(overrides['inputs-objectives']).toEqual({ level: 'high', budgetTokens: 12_000 });
    expect(overrides['inputs-constraints']).toEqual({ level: 'high', budgetTokens: 12_000 });
    expect((overrides as unknown as Record<string, unknown>).inputs).toBeUndefined();
  });

  it('drops the legacy `inputs` override when it was empty', async () => {
    const v1Persisted = {
      state: {
        overrides: { design: {}, inputs: {} },
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v1Persisted));

    const { useThinkingDefaultsStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useThinkingDefaultsStore.getState().overrides;

    expect(overrides['inputs-research']).toEqual({});
    expect(overrides['inputs-objectives']).toEqual({});
    expect(overrides['inputs-constraints']).toEqual({});
    expect((overrides as unknown as Record<string, unknown>).inputs).toBeUndefined();
  });
});
