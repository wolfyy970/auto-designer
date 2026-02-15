import type { CompiledPrompt } from './compiler';

export type OutputFormat = 'html' | 'react';
type GenerationStatus = 'pending' | 'generating' | 'complete' | 'error';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ProviderModel {
  id: string;
  name: string;
  contextLength?: number;
  supportsVision?: boolean;
}

export interface ProviderOptions {
  format: OutputFormat;
  model?: string;
  supportsVision?: boolean;
}

export interface Provenance {
  hypothesisSnapshot: {
    name: string;
    primaryEmphasis: string;
    rationale: string;
    dimensionValues: Record<string, string>;
  };
  designSystemSnapshot?: string;
  compiledPrompt: string;
  provider: string;
  model: string;
  format: OutputFormat;
  timestamp: string;
}

export interface GenerationResult {
  id: string;
  variantStrategyId: string;
  providerId: string;
  status: GenerationStatus;
  code?: string;
  error?: string;
  runId: string;
  runNumber: number;
  metadata: {
    model: string;
    tokensUsed?: number;
    durationMs?: number;
    completedAt?: string;
    truncated?: boolean;
  };
}

export interface GenerationProvider {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsParallel: boolean;
  supportedFormats: OutputFormat[];
  generate(prompt: CompiledPrompt, options: ProviderOptions): Promise<GenerationResult>;
  listModels(): Promise<ProviderModel[]>;
  isAvailable(): boolean;
}
