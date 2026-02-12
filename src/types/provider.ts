import type { CompiledPrompt } from './compiler';

export type OutputFormat = 'html' | 'react';
export type GenerationStatus = 'pending' | 'generating' | 'complete' | 'error';

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

export interface GenerationResult {
  id: string;
  variantStrategyId: string;
  providerId: string;
  status: GenerationStatus;
  code?: string;
  error?: string;
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
  supportedFormats: OutputFormat[];
  generate(prompt: CompiledPrompt, options: ProviderOptions): Promise<GenerationResult>;
  listModels(): Promise<ProviderModel[]>;
  isAvailable(): boolean;
}
