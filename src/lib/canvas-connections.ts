/** Valid source→target type pairs for manual edge creation */
export const VALID_CONNECTIONS: Record<string, Set<string>> = {
  designBrief: new Set(['compiler']),
  existingDesign: new Set(['compiler']),
  researchContext: new Set(['compiler']),
  objectivesMetrics: new Set(['compiler']),
  designConstraints: new Set(['compiler']),
  designSystem: new Set(['hypothesis']),
  compiler: new Set(['hypothesis']),
  hypothesis: new Set(['variant']),
  variant: new Set(['compiler', 'existingDesign', 'critique']),
  critique: new Set(['compiler']),
};

export function isValidConnection(sourceType: string, targetType: string): boolean {
  return VALID_CONNECTIONS[sourceType]?.has(targetType) ?? false;
}
