export const DEFAULT_DESIGN_SYSTEM_SOURCE_MODE = 'none' as const;
export const DESIGN_SYSTEM_SOURCE_MODES = ['none', 'wireframe', 'custom'] as const;
export type DesignSystemSourceMode = (typeof DESIGN_SYSTEM_SOURCE_MODES)[number];

export function isDesignSystemSourceMode(value: unknown): value is DesignSystemSourceMode {
  return typeof value === 'string' && (DESIGN_SYSTEM_SOURCE_MODES as readonly string[]).includes(value);
}
