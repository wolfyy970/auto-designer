import { describe, it, expect } from 'vitest';
import { compileVariantPrompts } from '../../test-support/compile-variant-prompts';
import { DESIGNER_HYPOTHESIS_INPUTS_TEMPLATE } from '../../../server/lib/prompt-templates';
import type { DesignSpec, SpecSectionId, ReferenceImage } from '../../types/spec';
import type { IncubationPlan, HypothesisStrategy } from '../../types/incubator';

const VARIANT_TEMPLATE = DESIGNER_HYPOTHESIS_INPUTS_TEMPLATE;

function makeSection(id: SpecSectionId, content = '') {
  return {
    id,
    content,
    images: [] as ReferenceImage[],
    lastModified: '2024-01-01T00:00:00Z',
  };
}

function makeSpec(overrides: Partial<DesignSpec> = {}): DesignSpec {
  return {
    id: 'spec-1',
    title: 'Test Spec',
    sections: {
      'design-brief': makeSection('design-brief', 'A SaaS onboarding flow'),
      'research-context': makeSection('research-context'),
      'objectives-metrics': makeSection('objectives-metrics'),
      'design-constraints': makeSection('design-constraints'),
      'design-system': makeSection('design-system'),
    },
    createdAt: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    version: 1,
    ...overrides,
  };
}

function makeStrategy(overrides: Partial<HypothesisStrategy> = {}): HypothesisStrategy {
  return {
    id: 'strategy-1',
    name: 'Trust-Forward',
    hypothesis: 'Showing social proof early reduces bounce.',
    rationale: 'Users abandon due to trust concerns.',
    measurements: 'Bounce rate, conversion funnel completion.',
    dimensionValues: { layout: 'single-column', density: 'sparse' },
    ...overrides,
  };
}

function makeIncubationPlan(hypotheses: HypothesisStrategy[]): IncubationPlan {
  return {
    id: 'dm-1',
    specId: 'spec-1',
    dimensions: [{ name: 'layout', range: 'single to multi-column', isConstant: false }],
    hypotheses,
    generatedAt: '2024-01-01T00:00:00Z',
    incubatorModel: 'gpt-4',
  };
}

describe('compileVariantPrompts', () => {
  it('returns one CompiledPrompt per hypothesis strategy', () => {
    const spec = makeSpec();
    const strategies = [makeStrategy({ id: 's-1' }), makeStrategy({ id: 's-2' })];
    const plan = makeIncubationPlan(strategies);

    const results = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(results).toHaveLength(2);
  });

  it('maps strategyId correctly', () => {
    const spec = makeSpec();
    const strategy = makeStrategy({ id: 'strategy-abc' });
    const plan = makeIncubationPlan([strategy]);

    const [result] = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(result.strategyId).toBe('strategy-abc');
    expect(result.specId).toBe('spec-1');
  });

  it('each result has a unique id and a prompt string', () => {
    const spec = makeSpec();
    const plan = makeIncubationPlan([makeStrategy({ id: 's-1' }), makeStrategy({ id: 's-2' })]);

    const results = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(results[0].id).not.toBe(results[1].id);
    expect(typeof results[0].prompt).toBe('string');
    expect(results[0].prompt.length).toBeGreaterThan(0);
  });

  it('includes global exploration axes and this hypothesis position in the prompt', () => {
    const spec = makeSpec();
    const strategy = makeStrategy();
    const plan = makeIncubationPlan([strategy]);

    const [result] = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(result.prompt).toContain('<exploration_axes>');
    expect(result.prompt).toContain('- layout (variable): single to multi-column');
    expect(result.prompt).toContain('<dimension_values>');
    expect(result.prompt).toContain('- layout: single-column');
    expect(result.prompt).toContain('- density: sparse');
  });

  it('uses explicit fallback text when no exploration axes or positions are available', () => {
    const spec = makeSpec();
    const strategy = makeStrategy({ dimensionValues: {} });
    const plan = { ...makeIncubationPlan([strategy]), dimensions: [] };

    const [result] = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(result.prompt).toContain('(No global exploration axes were provided)');
    expect(result.prompt).toContain('(No selected hypothesis position was provided)');
  });

  it('does not attach legacy spec-section images to compiled design prompts', () => {
    const img: ReferenceImage = {
      id: 'img-1', filename: 'shot.png', dataUrl: 'data:image/png;base64,abc',
      description: 'A screenshot', createdAt: '2024-01-01T00:00:00Z',
    };
    const spec = makeSpec({
      sections: {
        'design-brief': { ...makeSection('design-brief'), images: [img] },
        'research-context': makeSection('research-context'),
        'objectives-metrics': makeSection('objectives-metrics'),
        'design-constraints': makeSection('design-constraints'),
        'design-system': makeSection('design-system'),
      },
    });
    const plan = makeIncubationPlan([makeStrategy()]);

    const [result] = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(result.images).toEqual([]);
  });

  it('returns empty array when there are no hypotheses', () => {
    const spec = makeSpec();
    const plan = makeIncubationPlan([]);

    const results = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(results).toHaveLength(0);
  });

  it('includes compiledAt timestamp string', () => {
    const spec = makeSpec();
    const plan = makeIncubationPlan([makeStrategy()]);

    const [result] = compileVariantPrompts(spec, plan, VARIANT_TEMPLATE);

    expect(typeof result.compiledAt).toBe('string');
    expect(result.compiledAt.length).toBeGreaterThan(0);
  });
});
