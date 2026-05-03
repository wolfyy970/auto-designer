import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceDomainStore } from '../../stores/workspace-domain-store';
import { useTaskConfigStore } from '../../stores/task-config-store';
import { buildHypothesisGenerationContext } from '../workspace-session';
import type { HypothesisStrategy } from '../../types/incubator';
import type { DesignSpec } from '../../types/spec';

const strategy: HypothesisStrategy = {
  id: 'vs1',
  name: 'S',
  hypothesis: 'H',
  rationale: 'R',
  measurements: '',
  dimensionValues: {},
};

describe('buildHypothesisGenerationContext (domain)', () => {
  beforeEach(() => {
    useWorkspaceDomainStore.getState().reset();
    useTaskConfigStore.getState().resetAll();
  });

  it('uses Settings credential + domain design-system when hypothesis is registered', () => {
    useTaskConfigStore.getState().setModel('design', 'openrouter', 'gpt-4');
    useTaskConfigStore.getState().setLevel('design', 'low');

    useWorkspaceDomainStore.setState({
      hypotheses: {
        hyp1: {
          id: 'hyp1',
          incubatorId: 'c1',
          strategyId: 'vs1',
          designSystemNodeIds: ['ds1'],
          revisionEnabled: true,
          placeholder: false,
        },
      },
      designSystems: {
        ds1: {
          nodeId: 'ds1',
          title: 'DS',
          content: 'Hello',
          images: [],
        },
      },
    });

    const spec: DesignSpec = {
      id: 's',
      title: 't',
      sections: {},
      createdAt: '',
      lastModified: '',
      version: 1,
    };

    const ctx = buildHypothesisGenerationContext({
      hypothesisNodeId: 'hyp1',
      hypothesisStrategy: strategy,
      snapshot: { nodes: [], edges: [] },
      spec,
    });

    expect(ctx).not.toBeNull();
    expect(ctx!.modelCredentials).toEqual([
      { providerId: 'openrouter', modelId: 'gpt-4', thinkingLevel: 'low' },
    ]);
    expect(ctx!.designSystemContent).toContain('Hello');
  });
});
