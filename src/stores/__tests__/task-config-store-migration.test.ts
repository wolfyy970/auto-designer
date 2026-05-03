/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from '../../lib/storage-keys';

async function importStoreFresh(): Promise<typeof import('../task-config-store')> {
  vi.resetModules();
  return import('../task-config-store');
}

describe('task-config-store persist migrations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('v1 → v5: legacy `inputs` carries through; level survives', async () => {
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

    expect(overrides.design).toEqual({ level: 'xhigh' });
    expect(overrides.inputs).toEqual({ level: 'high' });
    // The split per-section keys never survive on the final shape.
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

  it('v3 → v5: collapses three customised input slots into one (constraints wins)', async () => {
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

    // 'maximum' (effort) → 'xhigh' (UiLevel) via the v5 effort-to-level rename.
    expect(overrides.inputs).toEqual({ level: 'xhigh' });
  });

  it('v2 → v5: legacy `level` survives with `minimal` collapsed into `low`; budgets dropped', async () => {
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

    expect(overrides.design).toEqual({ level: 'low' });
    expect(overrides.incubate).toEqual({ level: 'medium' });
    expect(overrides.evaluator).toEqual({});
    expect(overrides['design-system']).toEqual({ level: 'low' });
  });

  it('v4 → v5: effort vocabulary renames to level vocabulary', async () => {
    const v4 = {
      state: {
        overrides: {
          design: { effort: 'thorough' },
          incubate: { effort: 'maximum' },
          inputs: { effort: 'balanced' },
          evaluator: { effort: 'off' },
        },
      },
      version: 4,
    };
    localStorage.setItem(STORAGE_KEYS.THINKING_DEFAULTS, JSON.stringify(v4));

    const { useTaskConfigStore } = await importStoreFresh();
    await Promise.resolve();
    const overrides = useTaskConfigStore.getState().overrides;

    expect(overrides.design).toEqual({ level: 'high' });
    expect(overrides.incubate).toEqual({ level: 'xhigh' });
    expect(overrides.inputs).toEqual({ level: 'medium' });
    expect(overrides.evaluator).toEqual({ level: 'off' });
  });
});
