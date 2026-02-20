import type { ChatMessage } from '../services/compiler';

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
  /** Last status string emitted by the orchestrator's onProgress callback. */
  progressMessage?: string;
  /** File-level progress: how many planned files have been written vs. total. */
  progressStep?: { current: number; total: number };
}

export interface ChatResponse {
  raw: string;
  metadata?: {
    tokensUsed?: number;
    truncated?: boolean;
  };
}

// ── Native tool calling types ────────────────────────────────────────

/** JSON Schema-shaped tool definition for the OpenAI tools API. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A structured tool call returned by the model via the native tools API. */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Response from generateWithTools — structured calls plus any accompanying prose. */
export interface ToolChatResponse {
  toolCalls: ToolCall[];
  text?: string;
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
  /**
   * Optional native tool calling via the OpenAI tools API.
   * When present, the orchestrator uses this instead of XML parsing.
   * Providers that don't implement this fall back to generateChat + XML.
   */
  generateWithTools?(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions
  ): Promise<ToolChatResponse>;
  listModels(): Promise<ProviderModel[]>;
  isAvailable(): boolean;
}
