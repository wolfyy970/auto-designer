import { describe, expect, it } from 'vitest';
import {
  MISSING_EXPLORATION_AXIS_POSITION,
  normalizeIncubationPlanExplorationAxes,
} from '../exploration-axis-normalizer';
import type { IncubationPlan } from '../../types/incubator';

function plan(overrides: Partial<IncubationPlan> = {}): IncubationPlan {
  return {
    id: 'plan-1',
    specId: 'spec-1',
    dimensions: [],
    hypotheses: [
      {
        id: 'strategy-1',
        name: 'Focused',
        hypothesis: 'Focus the interface.',
        rationale: 'The spec requires focus.',
        measurements: 'Primary action visible.',
        dimensionValues: {},
      },
    ],
    generatedAt: '2024-01-01T00:00:00Z',
    incubatorModel: 'model',
    ...overrides,
  };
}

describe('normalizeIncubationPlanExplorationAxes', () => {
  it('drops blank and duplicate axes', () => {
    const normalized = normalizeIncubationPlanExplorationAxes(
      plan({
        dimensions: [
          { name: ' Density ', range: ' sparse to dense ', isConstant: false },
          { name: 'density', range: 'duplicate', isConstant: false },
          { name: '   ', range: 'blank', isConstant: false },
        ],
      }),
    );

    expect(normalized.dimensions).toEqual([
      { name: 'Density', range: 'sparse to dense', isConstant: false },
    ]);
  });

  it('canonicalizes position keys and drops unknown keys', () => {
    const normalized = normalizeIncubationPlanExplorationAxes(
      plan({
        dimensions: [{ name: 'Information density', range: 'sparse to dense', isConstant: false }],
        hypotheses: [
          {
            ...plan().hypotheses[0]!,
            dimensionValues: {
              ' information   density ': ' sparse ',
              output_format: 'react',
            },
          },
        ],
      }),
    );

    expect(normalized.hypotheses[0]!.dimensionValues).toEqual({
      'Information density': 'sparse',
    });
  });

  it('fills missing variable-axis positions but does not require constants', () => {
    const normalized = normalizeIncubationPlanExplorationAxes(
      plan({
        dimensions: [
          { name: 'Trust posture', range: 'implicit to explicit', isConstant: false },
          { name: 'Brand', range: 'Acme', isConstant: true },
        ],
      }),
    );

    expect(normalized.hypotheses[0]!.dimensionValues).toEqual({
      'Trust posture': MISSING_EXPLORATION_AXIS_POSITION,
    });
  });

  it('keeps output format only when it matches an explicit global axis', () => {
    const normalized = normalizeIncubationPlanExplorationAxes(
      plan({
        dimensions: [{ name: 'Output Format', range: 'HTML to React', isConstant: false }],
        hypotheses: [
          {
            ...plan().hypotheses[0]!,
            dimensionValues: { ' output format ': 'react' },
          },
        ],
      }),
    );

    expect(normalized.hypotheses[0]!.dimensionValues).toEqual({
      'Output Format': 'react',
    });
  });
});
