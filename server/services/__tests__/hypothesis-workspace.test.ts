import { describe, expect, it } from 'vitest';
import { buildHypothesisWorkspaceBundle } from '../hypothesis-workspace';
import type { HypothesisWorkspaceCoreInput } from '../../lib/hypothesis-schemas';
import type { DesignSpec, ReferenceImage, SpecSectionId } from '../../../src/types/spec';

function section(id: SpecSectionId, content = '') {
  return {
    id,
    content,
    images: [] as ReferenceImage[],
    lastModified: '2024-01-01T00:00:00Z',
  };
}

const spec: DesignSpec = {
  id: 'spec-1',
  title: 'Spec',
  sections: {
    'design-brief': section('design-brief', 'Brief'),
    'research-context': section('research-context', 'Research'),
    'objectives-metrics': section('objectives-metrics', 'Objectives'),
    'design-constraints': section('design-constraints', 'Constraints'),
    'design-system': section('design-system', 'Design system'),
  },
  createdAt: '2024-01-01T00:00:00Z',
  lastModified: '2024-01-01T00:00:00Z',
  version: 1,
};

describe('buildHypothesisWorkspaceBundle', () => {
  it('carries global exploration axes into the compiled design prompt', async () => {
    const body: HypothesisWorkspaceCoreInput = {
      hypothesisNodeId: 'hyp-1',
      strategy: {
        id: 'strategy-1',
        name: 'Sparse Trust',
        hypothesis: 'Show sparse trust proof at the decision point.',
        rationale: 'The brief needs fast confidence.',
        measurements: 'Proof adjacent to CTA.',
        dimensionValues: { 'Information density': 'sparse' },
      },
      dimensions: [
        { name: 'Information density', range: 'sparse to dense', isConstant: false },
      ],
      spec,
      snapshot: { nodes: [], edges: [] },
      domainHypothesis: null,
      designSystems: {},
      settingsCredential: {
        providerId: 'openrouter',
        modelId: 'model',
        thinkingLevel: 'off',
      },
    };

    const bundle = await buildHypothesisWorkspaceBundle(body);

    expect(bundle).not.toBeNull();
    expect(bundle!.prompts[0]!.prompt).toContain(
      '- Information density (variable): sparse to dense',
    );
    expect(bundle!.prompts[0]!.prompt).toContain('- Information density: sparse');
    expect(bundle!.prompts[0]!.prompt).toContain('<design_agent_instructions>');
    expect(bundle!.prompts[0]!.prompt).toContain('Treat the hypothesis as the thesis');
  });
});
