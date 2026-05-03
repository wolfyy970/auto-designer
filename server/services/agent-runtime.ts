/**
 * App-owned agent runtime facade.
 *
 * Server orchestration should import this module instead of Pi-specific service
 * modules. A future Pi SDK upgrade or replacement should be contained behind
 * this boundary while preserving these app contracts.
 */
import type { RunTraceEvent, TodoItem } from '../../src/types/provider.ts';
import type { SessionType } from '../lib/session-types.ts';
import type { ThinkingLevel } from '../../src/lib/thinking-defaults.ts';

export interface AgentRunParams {
  systemPrompt: string;
  userPrompt: string;
  providerId: string;
  modelId: string;
  thinkingLevel?: ThinkingLevel;
  signal?: AbortSignal;
}

/** Tags the LLM-log entry's `phase` field. `revision` only fires on round ≥ 2. */
export type AgentSessionPhase = 'agentic_turn' | 'revision';

/** Extended session for revision rounds: seeded virtual FS + log phase. */
export interface AgentSessionParams extends AgentRunParams {
  /** Drives LLM log source and task observability. */
  sessionType?: SessionType;
  correlationId?: string;
  seedFiles?: Record<string, string>;
  /** Defaults to `'agentic_turn'`; orchestrator sets `'revision'` on rounds ≥ 2. */
  phase?: AgentSessionPhase;
  initialProgressMessage?: string;
}

export interface DesignAgentSessionResult {
  files: Record<string, string>;
  todos: TodoItem[];
  /** Paths that already received live `file` SSE during this session. */
  emittedFilePaths: string[];
}

export interface AgentRuntimeError {
  message: string;
  cause?: unknown;
}

export type AgentRunEvent =
  | { type: 'activity' | 'progress' | 'code' | 'error'; payload: string }
  | { type: 'thinking'; payload: string; turnId: number }
  | { type: 'file'; path: string; content: string }
  | { type: 'plan'; files: string[] }
  | { type: 'todos'; todos: TodoItem[] }
  | { type: 'skill_activated'; key: string; name: string; description: string }
  | {
      type: 'streaming_tool';
      toolName: string;
      streamedChars: number;
      done: boolean;
      toolPath?: string;
    }
  | { type: 'trace'; trace: RunTraceEvent };

export { runPiAgentSession as runDesignAgentSession } from './pi-agent-runtime.ts';

export type { ThinkingLevel };
