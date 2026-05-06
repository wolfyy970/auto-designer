import { describe, expect, it } from 'vitest';
import { migrateWorkspaceDomainPersist } from '../workspace-domain-migrate';

describe('migrateWorkspaceDomainPersist', () => {
  it('legacy v1 input still migrates through to current shape', () => {
    const v1 = { hypotheses: {}, modelProfiles: {} };
    const out = migrateWorkspaceDomainPersist(v1, 1) as Record<string, unknown>;
    // v12 strips Model fields from the persisted shape entirely.
    expect(out.incubatorModelNodeIds).toBeUndefined();
    expect(out.modelProfiles).toBeUndefined();
    expect(out.hypotheses).toEqual({});
  });

  it('v11 → v12 strips Model-node fields from the persisted shape', () => {
    const v11 = {
      hypotheses: {
        h1: {
          id: 'h1',
          incubatorId: 'inc',
          strategyId: 's1',
          modelNodeIds: ['m1'],
          designSystemNodeIds: [],
          placeholder: false,
          revisionEnabled: true,
        },
      },
      modelProfiles: { m1: { nodeId: 'm1', providerId: 'openrouter', modelId: 'x' } },
      incubatorWirings: {},
      previewSlots: {},
      incubatorModelNodeIds: { inc: ['m1'] },
    };
    const out = migrateWorkspaceDomainPersist(v11, 11) as {
      hypotheses: Record<string, Record<string, unknown>>;
      modelProfiles?: unknown;
      incubatorModelNodeIds?: unknown;
    };
    expect(out.hypotheses.h1!.modelNodeIds).toBeUndefined();
    expect(out.modelProfiles).toBeUndefined();
    expect(out.incubatorModelNodeIds).toBeUndefined();
  });

  it('v10 → v11 strips retired existing design input wiring', () => {
    const v10 = {
      hypotheses: {},
      modelProfiles: {},
      previewSlots: {},
      designSystems: {},
      incubatorModelNodeIds: {},
      incubatorWirings: {
        inc1: {
          inputNodeIds: ['designBrief-1', 'existingDesign-legacy'],
          previewNodeIds: ['preview-1'],
          designSystemNodeIds: ['designSystem-1'],
        },
      },
    };
    const out = migrateWorkspaceDomainPersist(v10, 10) as {
      incubatorWirings: Record<string, Record<string, unknown> & { inputNodeIds: string[] }>;
    };
    expect(out.incubatorWirings.inc1!.inputNodeIds).toEqual(['designBrief-1']);
    expect(out.incubatorWirings.inc1).not.toHaveProperty('designSystemNodeIds');
  });

  it('v12 → v13 strips retired incubator design-system wiring', () => {
    const v12 = {
      hypotheses: {},
      previewSlots: {},
      designSystems: {},
      incubatorWirings: {
        inc1: {
          inputNodeIds: ['brief-1'],
          previewNodeIds: ['preview-1'],
          designSystemNodeIds: ['design-system-1'],
        },
      },
    };
    const out = migrateWorkspaceDomainPersist(v12, 12) as {
      incubatorWirings: Record<string, Record<string, unknown>>;
    };

    expect(out.incubatorWirings.inc1).toEqual({
      inputNodeIds: ['brief-1'],
      previewNodeIds: ['preview-1'],
    });
  });

  it('normalizes malformed top-level collections to empty records', () => {
    const out = migrateWorkspaceDomainPersist(
      {
        hypotheses: 'bad',
        modelProfiles: null,
        incubatorWirings: [],
        previewSlots: 42,
        designSystems: undefined,
        incubatorModelNodeIds: 'bad',
      },
      10,
    ) as Record<string, unknown>;
    expect(out).toEqual({
      hypotheses: {},
      incubatorWirings: {},
      previewSlots: {},
      designSystems: {},
    });
  });
});
