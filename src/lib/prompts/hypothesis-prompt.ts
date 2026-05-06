import type { DesignSpec } from '../../types/spec';
import type { Dimension, HypothesisStrategy } from '../../types/incubator';
import { interpolate } from '../utils';
import { getSectionContent } from './helpers';

function formatExplorationAxes(dimensions: readonly Dimension[]): string {
  if (dimensions.length === 0) return '(No global exploration axes were provided)';
  return dimensions
    .map((dimension) => {
      const constancy = dimension.isConstant ? 'constant' : 'variable';
      return `- ${dimension.name} (${constancy}): ${dimension.range}`;
    })
    .join('\n');
}

export function buildHypothesisPrompt(
  spec: DesignSpec,
  strategy: HypothesisStrategy,
  hypothesisTemplate: string,
  dimensions: readonly Dimension[] = [],
  designSystemOverride?: string,
): string {
  const dimensionValuesList = Object.entries(strategy.dimensionValues)
    .map(([dim, val]) => `- ${dim}: ${val}`)
    .join('\n');

  return interpolate(hypothesisTemplate, {
    STRATEGY_NAME: strategy.name,
    HYPOTHESIS: strategy.hypothesis,
    RATIONALE: strategy.rationale,
    MEASUREMENTS: strategy.measurements,
    EXPLORATION_AXES: formatExplorationAxes(dimensions),
    DIMENSION_VALUES: dimensionValuesList || '(No selected hypothesis position was provided)',
    DESIGN_BRIEF: getSectionContent(spec, 'design-brief'),
    RESEARCH_CONTEXT: getSectionContent(spec, 'research-context'),
    IMAGE_BLOCK: '',
    OBJECTIVES_METRICS: getSectionContent(spec, 'objectives-metrics'),
    DESIGN_CONSTRAINTS: getSectionContent(spec, 'design-constraints'),
    DESIGN_SYSTEM: designSystemOverride ?? getSectionContent(spec, 'design-system'),
  });
}
