import { describe, it, expect } from 'vitest';
import { NODE_TYPES } from '../../constants/canvas';
import {
  countConnectedIncubatorInputs,
  resolveIncubatorSourceState,
} from '../incubator-input-count';
import type { DesignSpec, ReferenceImage, SpecSectionId } from '../../types/spec';
import type { DomainIncubatorWiring } from '../../types/workspace-domain';

const INC = 'incubator-1';

const brief = { id: 'brief-1', type: NODE_TYPES.DESIGN_BRIEF, data: {} };
const research = { id: 'research-1', type: NODE_TYPES.RESEARCH_CONTEXT, data: {} };
const objectives = { id: 'obj-1', type: NODE_TYPES.OBJECTIVES_METRICS, data: {} };
const constraints = { id: 'cons-1', type: NODE_TYPES.DESIGN_CONSTRAINTS, data: {} };
const designSystem = { id: 'ds-1', type: NODE_TYPES.DESIGN_SYSTEM, data: { sourceMode: 'wireframe' } };
const preview = { id: 'preview-1', type: NODE_TYPES.PREVIEW, data: { refId: 'result-1' } };
const incubatorNode = { id: INC, type: NODE_TYPES.INCUBATOR, data: {} };

function section(id: SpecSectionId, content = '') {
  return {
    id,
    content,
    images: [] as ReferenceImage[],
    lastModified: '2026-01-01T00:00:00Z',
  };
}

function makeSpec(overrides: Partial<Record<SpecSectionId, string>> = {}): DesignSpec {
  return {
    id: 'spec-1',
    title: 'Spec',
    createdAt: '2026-01-01T00:00:00Z',
    lastModified: '2026-01-01T00:00:00Z',
    version: 1,
    sections: {
      'design-brief': section('design-brief', overrides['design-brief']),
      'existing-design': section('existing-design', overrides['existing-design']),
      'research-context': section('research-context', overrides['research-context']),
      'objectives-metrics': section('objectives-metrics', overrides['objectives-metrics']),
      'design-constraints': section('design-constraints', overrides['design-constraints']),
      'design-system': section('design-system', overrides['design-system']),
    },
  };
}

describe('resolveIncubatorSourceState', () => {
  it('ignores Design System edges because visual-system context belongs to design generation', () => {
    const state = resolveIncubatorSourceState(
      [incubatorNode, brief, designSystem],
      [
        { source: brief.id, target: INC },
        { source: designSystem.id, target: INC },
      ],
      INC,
      makeSpec(),
    );

    expect(state.connectedSourceCount).toBe(0);
    expect(state.activeSpecInputNodeIds).toEqual([]);
  });

  it('counts a filled Design Brief without counting the Design System', () => {
    const state = resolveIncubatorSourceState(
      [incubatorNode, brief, designSystem],
      [
        { source: brief.id, target: INC },
        { source: designSystem.id, target: INC },
      ],
      INC,
      makeSpec({ 'design-brief': 'Ship a calmer onboarding.' }),
    );

    expect(state.connectedSourceCount).toBe(1);
    expect(state.activeSpecSectionIds).toEqual(['design-brief']);
    expect(countConnectedIncubatorInputs(
      [incubatorNode, brief, designSystem],
      [
        { source: brief.id, target: INC },
        { source: designSystem.id, target: INC },
      ],
      INC,
      makeSpec({ 'design-brief': 'Ship a calmer onboarding.' }),
    )).toBe(1);
  });

  it('lets filled optional input nodes act as active sources even when an old graph is missing the edge', () => {
    const state = resolveIncubatorSourceState(
      [incubatorNode, brief, research, designSystem],
      [
        { source: brief.id, target: INC },
        { source: designSystem.id, target: INC },
      ],
      INC,
      makeSpec({
        'design-brief': 'Ship a calmer onboarding.',
        'research-context': 'Users abandon after the second question.',
      }),
    );

    expect(state.connectedSourceCount).toBe(2);
    expect(state.specInputs.find((source) => source.nodeId === research.id)).toMatchObject({
      active: true,
      structurallyConnected: false,
    });
  });

  it('excludes Design System regardless of source mode or material', () => {
    const base = [incubatorNode, brief];
    const edges = [{ source: designSystem.id, target: INC }];
    expect(
      resolveIncubatorSourceState(
        [...base, { ...designSystem, data: { sourceMode: 'none', content: 'Saved custom notes.' } }],
        edges,
        INC,
        makeSpec(),
      ).connectedSourceCount,
    ).toBe(0);

    expect(
      resolveIncubatorSourceState(
        [...base, { ...designSystem, data: { sourceMode: 'custom', content: '', images: [], markdownSources: [] } }],
        edges,
        INC,
        makeSpec(),
      ).connectedSourceCount,
    ).toBe(0);

    expect(
      resolveIncubatorSourceState(
        [...base, { ...designSystem, data: { sourceMode: 'custom', content: 'Use sharp editorial typography.' } }],
        edges,
        INC,
        makeSpec(),
      ).connectedSourceCount,
    ).toBe(0);
  });

  it('ignores stale wiring ids but keeps live wired and active content-bearing sources', () => {
    const wiring: DomainIncubatorWiring = {
      inputNodeIds: [brief.id, 'ghost-research'],
      previewNodeIds: ['ghost-preview'],
    };

    const state = resolveIncubatorSourceState(
      [incubatorNode, brief, objectives, designSystem],
      [],
      INC,
      makeSpec({
        'design-brief': 'Ship a calmer onboarding.',
        'objectives-metrics': 'Reduce setup uncertainty.',
      }),
      wiring,
    );

    expect(state.connectedSourceCount).toBe(2);
    expect(state.activeSpecInputNodeIds.sort()).toEqual([brief.id, objectives.id].sort());
  });

  it('counts preview references only when scoped to the incubator', () => {
    const state = resolveIncubatorSourceState(
      [incubatorNode, preview, constraints],
      [
        { source: preview.id, target: INC },
        { source: constraints.id, target: 'other-incubator' },
      ],
      INC,
      makeSpec({ 'design-constraints': 'Must support keyboard-only users.' }),
    );

    expect(state.connectedSourceCount).toBe(2);
    expect(state.activePreviewNodeIds).toEqual([preview.id]);
    expect(state.activeSpecInputNodeIds).toEqual([constraints.id]);
  });
});
