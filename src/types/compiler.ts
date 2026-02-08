import type { ReferenceImage } from './spec';

export interface VariantStrategy {
  id: string;
  name: string;
  primaryEmphasis: string;
  rationale: string;
  howItDiffers: string;
  coupledDecisions: string;
  dimensionValues: Record<string, string>;
}

export interface Dimension {
  name: string;
  range: string;
  isConstant: boolean;
}

export interface DimensionMap {
  id: string;
  specId: string;
  dimensions: Dimension[];
  variants: VariantStrategy[];
  generatedAt: string;
  approvedAt?: string;
  compilerModel: string;
}

export interface CompiledPrompt {
  id: string;
  variantStrategyId: string;
  specId: string;
  prompt: string;
  images: ReferenceImage[];
  compiledAt: string;
}
