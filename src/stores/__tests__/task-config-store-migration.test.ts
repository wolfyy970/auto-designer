/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from '../../lib/storage-keys';

async function importStoreFresh(): Promise<typeof import('../task-config-store')> {
  vi.resetModules();
  return import('../task-config-store');
}

describe('thinking-defaults-store migrations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('v1 → v4: legacy `inputs` carries through to the collapsed `inputs` slot, level → effort', async () => {
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

    const { useTaskConfigStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useTaskConfigStore.getState().overrides;

    expect(overrides.design).toEqual({ effort: 'maximum' });
    expect(overrides.inputs).toEqual({ effort: 'thorough' });
    // The split per-section keys never exist on the final shape.
    const raw = overrides as unknown as Record<string, unknown>;
    expect(raw['inputs-research']).toBeUndefined();
    expect(raw['inputs-objectives']).toBeUndefined();
    expect(raw['inputs-constraints']).toBeUndefined();
    for (const t of Object.keys(overrides)) {
      expect(
        (overrides[t as keyof typeof overrides] as Record<string, unknown>).budgetTokens,
      ).toBeUndefined();
    }
  });

  it('v3 → v4: collapses three customised input slots into one (constraints wins)', async () => {
    const v3 = {
      state: {
        overrides: {
          design: {},
          'inputs-research': { effort: 'quick' },
          'inputs-objectives': { effort: 'balanced' },
          'inputs-constraints': { effort: 'maximum' },
        },
      },
      version: 3,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v3));

    const { useTaskConfigStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useTaskConfigStore.getState().overrides;

    expect(overrides.inputs).toEqual({ effort: 'maximum' });
  });

  it('v2 → v4: legacy `level` overrides become `effort`; budgets are dropped', async () => {
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

    const { useTaskConfigStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useTaskConfigStore.getState().overrides;

    expect(overrides.design).toEqual({ effort: 'quick' });
    expect(overrides.incubate).toEqual({ effort: 'balanced' });
    expect(overrides.evaluator).toEqual({});
    expect(overrides['design-system']).toEqual({ effort: 'quick' });
  });
});
