import type { GenerationStatus } from '../constants/generation';

export type { GenerationStatus };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

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
  model?: string;
  supportsVision?: boolean;
}

export interface Provenance {
  hypothesisSnapshot: {
    name: string;
    hypothesis: string;
    rationale: string;
    dimensionValues: Record<string, string>;
  };
  designSystemSnapshot?: string;
  compiledPrompt: string;
  provider: string;
  model: string;
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
  progressMessage?: string;
  activityLog?: string[];
}

export interface ChatResponse {
  raw: string;
  metadata?: {
    tokensUsed?: number;
    truncated?: boolean;
  };
}

export interface GenerationProvider {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
  supportsParallel: boolean;
  generateChat(messages: ChatMessage[], options: ProviderOptions): Promise<ChatResponse>;
  listModels(): Promise<ProviderModel[]>;
  isAvailable(): boolean;
}
