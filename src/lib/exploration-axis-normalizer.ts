import type { Dimension, HypothesisStrategy, IncubationPlan } from '../types/incubator';

export const MISSING_EXPLORATION_AXIS_POSITION = 'not specified';

export function normalizeExplorationAxisKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeExplorationAxes(dimensions: readonly Dimension[]): Dimension[] {
  const seen = new Set<string>();
  const normalized: Dimension[] = [];

  for (const dimension of dimensions) {
    const name = normalizeDisplayText(dimension.name);
    if (!name) continue;

    const key = normalizeExplorationAxisKey(name);
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      name,
      range: normalizeDisplayText(dimension.range),
      isConstant: dimension.isConstant,
    });
  }

  return normalized;
}

export function normalizeHypothesisAxisPositions(
  strategy: HypothesisStrategy,
  dimensions: readonly Dimension[],
): HypothesisStrategy {
  const axes = normalizeExplorationAxes(dimensions);
  const axisNamesByKey = new Map(axes.map((axis) => [normalizeExplorationAxisKey(axis.name), axis.name]));
  const values: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(strategy.dimensionValues)) {
    const key = normalizeExplorationAxisKey(rawKey);
    if (!key || !axisNamesByKey.has(key)) continue;

    const axisName = axisNamesByKey.get(key)!;
    if (Object.prototype.hasOwnProperty.call(values, axisName)) continue;

    values[axisName] = normalizeDisplayText(rawValue);
  }

  for (const axis of axes) {
    if (axis.isConstant) continue;
    if (!values[axis.name]) values[axis.name] = MISSING_EXPLORATION_AXIS_POSITION;
  }

  return { ...strategy, dimensionValues: values };
}

export function normalizeIncubationPlanExplorationAxes<T extends IncubationPlan>(plan: T): T {
  const dimensions = normalizeExplorationAxes(plan.dimensions);
  return {
    ...plan,
    dimensions,
    hypotheses: plan.hypotheses.map((strategy) =>
      normalizeHypothesisAxisPositions(strategy, dimensions),
    ),
  };
}
