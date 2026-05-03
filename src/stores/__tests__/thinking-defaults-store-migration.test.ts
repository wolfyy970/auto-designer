/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from '../../lib/storage-keys';

async function importStoreFresh(): Promise<typeof import('../thinking-defaults-store')> {
  // Drop the module cache so persist's hydrate runs against the current
  // localStorage value. Each test seeds its own legacy blob first.
  vi.resetModules();
  return import('../thinking-defaults-store');
}

describe('thinking-defaults-store migrations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('v1 → v3: copies legacy `inputs` to the three split slots, then collapses level → effort', async () => {
    const v1 = {
      state: {
        overrides: {
          design: { level: 'xhigh' },
          incubate: {},
          'internal-context': {},
          inputs: { level: 'high', budgetTokens: 12_000 },
          'design-system': {},
          evaluator: {},
        },
      },
      version: 1,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v1));

    const { useThinkingDefaultsStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useThinkingDefaultsStore.getState().overrides;

    expect(overrides.design).toEqual({ effort: 'maximum' });
    expect(overrides['inputs-research']).toEqual({ effort: 'thorough' });
    expect(overrides['inputs-objectives']).toEqual({ effort: 'thorough' });
    expect(overrides['inputs-constraints']).toEqual({ effort: 'thorough' });
    // The old top-level inputs key is dropped, and budgets do not survive.
    expect((overrides as unknown as Record<string, unknown>).inputs).toBeUndefined();
    for (const t of Object.keys(overrides)) {
      expect((overrides[t as keyof typeof overrides] as Record<string, unknown>).budgetTokens).toBeUndefined();
    }
  });

  it('v1 → v3: empty legacy `inputs` produces empty overrides on all three slots', async () => {
    const v1 = { state: { overrides: { design: {}, inputs: {} } }, version: 1 };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v1));

    const { useThinkingDefaultsStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useThinkingDefaultsStore.getState().overrides;

    expect(overrides['inputs-research']).toEqual({});
    expect(overrides['inputs-objectives']).toEqual({});
    expect(overrides['inputs-constraints']).toEqual({});
    expect((overrides as unknown as Record<string, unknown>).inputs).toBeUndefined();
  });

  it('v2 → v3: legacy `level` overrides become `effort`; budgets are dropped', async () => {
    const v2 = {
      state: {
        overrides: {
          design: { level: 'low', budgetTokens: 4096 },
          incubate: { level: 'medium' },
          evaluator: { budgetTokens: 99 },
          'design-system': { level: 'minimal' },
        },
      },
      version: 2,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v2));

    const { useThinkingDefaultsStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useThinkingDefaultsStore.getState().overrides;

    expect(overrides.design).toEqual({ effort: 'quick' });
    expect(overrides.incubate).toEqual({ effort: 'balanced' });
    // budgetTokens-only override has no effort signal — drops to {}.
    expect(overrides.evaluator).toEqual({});
    expect(overrides['design-system']).toEqual({ effort: 'quick' });
  });
});
