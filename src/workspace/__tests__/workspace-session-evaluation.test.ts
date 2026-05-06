import { describe, it, expect } from 'vitest';
import { evaluationPayloadFromHypothesisContext } from '../workspace-session';
import type { HypothesisGenerationContext } from '../workspace-session';
import type { HypothesisStrategy } from '../../types/incubator';
import type { DesignSpec } from '../../types/spec';

const baseStrategy = (dimensionValues: Record<string, string>): HypothesisStrategy => ({
  id: 'vs1',
  name: 'S',
  hypothesis: 'H',
  rationale: 'R',
  measurements: 'M',
  dimensionValues,
});

const baseSpec: DesignSpec = {
  id: 'spec1',
  title: 'T',
  sections: {
    'objectives-metrics': {
      id: 'objectives-metrics',
      content: 'Obj content',
      images: [],
      lastModified: '',
    },
    'design-constraints': {
      id: 'design-constraints',
      content: 'Constraint content',
      images: [],
      lastModified: '',
    },
  },
  createdAt: '',
  lastModified: '',
  version: 1,
};

function ctx(overrides: Partial<HypothesisGenerationContext>): HypothesisGenerationContext {
  return {
    hypothesisNodeId: 'h1',
    hypothesisStrategy: baseStrategy({}),
    dimensions: [],
    spec: baseSpec,
    modelCredentials: [
      { providerId: 'openrouter', modelId: 'm', thinkingLevel: 'off' },
    ],
    designSystemContent: undefined,
    ...overrides,
  };
}

describe('evaluationPayloadFromHypothesisContext', () => {
  it('keeps hypothesis positions as strategy context without deriving outputFormat', () => {
    const p = evaluationPayloadFromHypothesisContext(
      ctx({ hypothesisStrategy: baseStrategy({ format: 'html' }) }),
    );
    expect(p.outputFormat).toBeUndefined();
    expect(p.dimensionValues).toEqual({ format: 'html' });
    expect(p.hypothesis).toBe('H');
    expect(p.objectivesMetrics).toBe('Obj content');
    expect(p.designConstraints).toBe('Constraint content');
  });

  it('omits outputFormat when no format keys set', () => {
    const p = evaluationPayloadFromHypothesisContext(ctx({}));
    expect(p.outputFormat).toBeUndefined();
  });
});
