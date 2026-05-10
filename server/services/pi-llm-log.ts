/**
 * Wrap Pi `streamFn` (coding-agent `Agent`) so each model turn is recorded in the dev LLM log (`/api/logs`).
 */
import { performance } from 'node:perf_hooks';
import {
  streamSimple,
  type Context,
  type Message,
  type AssistantMessage,
  type UserMessage,
  type ToolResultMessage,
} from '@auto-designer/pi';
import { piStreamCompletionMaxTokens } from '../lib/pi-stream-budget.ts';

/** Pi agent `streamFn` hook: `streamSimple` arity, stream or Promise of stream. */
export type PiAgentStreamFn = (
  ...args: Parameters<typeof streamSimple>
) => ReturnType<typeof streamSimple> | Promise<ReturnType<typeof streamSimple>>;
import type { LlmLogEntry } from '../log-store.ts';
import type { SessionType } from '../lib/session-types.ts';
import {
  beginLlmCall,
  failLlmCall,
  finalizeLlmCall,
  getLlmLogResponseSnapshot,
  logLlmCall,
} from '../log-store.ts';
import { providerLogFields } from './llm-log-metadata.ts';
import { stripProviderControlTokens } from '../lib/stream-sanitize.ts';
import { normalizeError } from '../../src/lib/error-utils.ts';
import { mergeStreamedAndFormattedAssistantResponse } from '../lib/merge-streamed-formatted-assistant.ts';

/** `phase` on LLM log rows for Pi agent turns (see `wrapPiStreamWithLogging`). */
export const PI_LLM_LOG_PHASE = {
  AGENTIC_TURN: 'agentic_turn',
  REVISION: 'revision',
} as const;

/** Maps Pi session boundary to `LlmLogEntry.source` for flow-aware logs. */
export function mapSessionTypeToLlmLogSource(sessionType?: SessionType): LlmLogEntry['source'] {
  switch (sessionType) {
    case 'incubation':
      return 'incubator';
    case 'inputs-gen':
      return 'inputsGen';
    case 'design-system':
      return 'designSystem';
    case 'evaluation':
    case 'design':
    default:
      return 'builder';
  }
}

/** Never throws; logging must not break Pi streaming. Exported for tests. */
export function safeLogLlmCall(entry: Omit<LlmLogEntry, 'id' | 'timestamp'>): void {
  try {
    logLlmCall(entry);
  } catch (logErr) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[pi-llm-log] logLlmCall failed', logErr);
    }
  }
}

function userOrToolContentToString(content: UserMessage['content'] | ToolResultMessage['content']): string {
  if (typeof content === 'string') return content;
  return content.map((p) => (p.type === 'text' ? p.text : '[image]')).join('');
}

/** Visible test hook: serialize Pi LLM context the same way we store it in LlmLogEntry. */
export function piContextToLogFields(context: Context): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = context.systemPrompt?.trim() || '(no system message)';

  const formatOne = (m: Message): string => {
    if (m.role === 'user') {
      return userOrToolContentToString(m.content);
    }
    if (m.role === 'toolResult') {
      const body = userOrToolContentToString(m.content);
      return `[tool_result ${m.toolName}]\n${body}`;
    }
    if (m.role === 'assistant') {
      return formatAssistantForLog(m);
    }
    return '';
  };

  const chunks = context.messages.map(formatOne).filter(Boolean);
  return {
    systemPrompt,
    userPrompt: chunks.join('\n\n') || '(no user message)',
  };
}

function formatAssistantForLog(m: AssistantMessage): string {
  const parts: string[] = [];
  for (const c of m.content) {
    if (c.type === 'text') parts.push(stripProviderControlTokens(c.text));
    else if (c.type === 'thinking')
      parts.push(`[thinking]\n${stripProviderControlTokens(c.thinking)}`);
    else if (c.type === 'toolCall') {
      const path = typeof c.arguments?.path === 'string' ? c.arguments.path : undefined;
      const cmd =
        typeof c.arguments?.command === 'string' ? c.arguments.command : undefined;
      if (c.name === 'bash' && cmd) {
        const short = cmd.length > 200 ? `${cmd.slice(0, 197)}…` : cmd;
        parts.push(`[tool_call ${c.name} command=${JSON.stringify(short)}]`);
      } else {
        parts.push(
          path
            ? `[tool_call ${c.name} path=${path}]`
            : `[tool_call ${c.name} ${JSON.stringify(c.arguments)}]`,
        );
      }
    }
  }
  return parts.join('\n');
}

function toolCallsForLog(m: AssistantMessage): { name: string; path?: string }[] {
  const out: { name: string; path?: string }[] = [];
  for (const c of m.content) {
    if (c.type !== 'toolCall') continue;
    const path = typeof c.arguments?.path === 'string' ? c.arguments.path : undefined;
    out.push({ name: c.name, path });
  }
  return out;
}

export interface LoggedPiStreamFnParams {
  providerId: string;
  modelId: string;
  source: LlmLogEntry['source'];
  phase?: string;
  correlationId?: string;
  turnLogRef: { current?: string };
  /**
   * Optional set of in-flight log-finalization promises. The wrapper inserts
   * each turn's logging Promise on creation and removes it on settle, so the
   * caller can `await Promise.allSettled(...pending)` before returning to
   * ensure no log entries are dropped if the runtime tears down before the
   * fire-and-forget finalize completes. Without this, a runtime that returns
   * within milliseconds of stream end (e.g. a one-turn task) can race the
   * finalize IIFE and lose its log entry.
   */
  pendingLogFinalizers?: Set<Promise<void>>;
}

/**
 * Wrap an existing Pi `StreamFn` (e.g. the SDK's auth-injecting `streamFn`) with LLM logging.
 */
export function wrapPiStreamWithLogging(
  inner: PiAgentStreamFn,
  params: LoggedPiStreamFnParams,
): PiAgentStreamFn {
  return ((model, context, options) => {
    const streamMax = piStreamCompletionMaxTokens(model, context, options?.maxTokens);
    /**
     * Diagnostic: log every streamFn invocation BEFORE awaiting `inner(...)`.
     * Without this, a turn whose underlying fetch never resolves (network-level
     * hang on the LLM request) is invisible — `beginLlmCall` only fires after
     * the inner Promise resolves, so a hung turn produces zero log entries.
     * With this debug line, a future hang shows up as "started, never finalized"
     * which is enough to localize the failure to the fetch layer.
     */
    if (process.env.NODE_ENV !== 'production') {
       
      console.debug('[pi-llm-log] streamFn invoked', {
        provider: params.providerId,
        model: params.modelId || model.id,
        source: params.source,
        phase: params.phase,
        correlationId: params.correlationId,
        turnMessages: context.messages.length,
      });
    }
    return Promise.resolve(
      inner(model, context, { ...options, maxTokens: streamMax }),
    ).then((stream) => {
      // Paired with the streamFn-invoked log above. Gap between the two
      // localizes hangs to either pre-stream (inner Promise never resolves)
      // or intra-stream (inner resolved but no chunks ever flow through the
      // bridge — caught by the runtime's stream-idle watchdog).
      if (process.env.NODE_ENV !== 'production') {
         
        console.debug('[pi-llm-log] streamFn resolved (stream object received)', {
          provider: params.providerId,
          model: params.modelId || model.id,
          source: params.source,
          phase: params.phase,
          correlationId: params.correlationId,
        });
      }
      const t0 = performance.now();
      const pv = providerLogFields(params.providerId);
      const modelLabel = params.modelId || model.id;
      const { systemPrompt, userPrompt } = piContextToLogFields(context);

      const logId = beginLlmCall({
        source: params.source,
        phase: params.phase,
        model: modelLabel,
        ...pv,
        systemPrompt,
        userPrompt,
        response: '',
        ...(params.correlationId ? { correlationId: params.correlationId } : {}),
      });
      params.turnLogRef.current = logId;

      const finalizePromise = finalizeLogFromStream(stream, {
        logId,
        t0,
        params,
      });

      // Track the pending finalize so the caller can drain pending logs
      // before tearing down. Without this, a runtime that returns within
      // milliseconds of stream end can race the finalize IIFE and lose its
      // log entry.
      if (params.pendingLogFinalizers) {
        params.pendingLogFinalizers.add(finalizePromise);
        void finalizePromise.finally(() => {
          params.pendingLogFinalizers?.delete(finalizePromise);
        });
      }

      return stream;
    });
  }) as PiAgentStreamFn;
}

/**
 * Drains a Pi `stream.result()` into the LLM log: reads the final assistant
 * message, merges with whatever was streamed live, finalizes (or fails) the
 * row, and clears `turnLogRef`. Emits paired `[pi-llm-log] logging
 * finalized` / `logging failed` debug logs so a logging-side issue is
 * visible instead of being silently swallowed by the prior `void (async
 * IIFE)` pattern.
 */
async function finalizeLogFromStream(
  stream: Awaited<ReturnType<PiAgentStreamFn>>,
  args: { logId: string; t0: number; params: LoggedPiStreamFnParams },
): Promise<void> {
  const { logId, t0, params } = args;
  try {
    const final = await stream.result();
    const formatted = formatAssistantForLog(final);
    const streamed = getLlmLogResponseSnapshot(logId) ?? '';
    const response = mergeStreamedAndFormattedAssistantResponse(streamed, formatted);
    const toolCalls = toolCallsForLog(final);
    const durationMs = Math.round(performance.now() - t0);
    finalizeLlmCall(logId, {
      response,
      durationMs,
      promptTokens: final.usage?.input,
      completionTokens: final.usage?.output,
      totalTokens: final.usage?.totalTokens,
      truncated: final.stopReason === 'length',
      toolCalls: toolCalls.length ? toolCalls : undefined,
      error:
        final.stopReason === 'error' || final.stopReason === 'aborted'
          ? (final.errorMessage ?? final.stopReason)
          : undefined,
    });
    if (process.env.NODE_ENV !== 'production') {
       
      console.debug('[pi-llm-log] logging finalized', {
        logId,
        durationMs,
        correlationId: params.correlationId,
        stopReason: final.stopReason,
      });
    }
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    failLlmCall(logId, normalizeError(err), durationMs);
    if (process.env.NODE_ENV !== 'production') {
       
      console.debug('[pi-llm-log] logging failed', {
        logId,
        durationMs,
        correlationId: params.correlationId,
        error: normalizeError(err),
      });
    }
  } finally {
    if (params.turnLogRef.current === logId) {
      params.turnLogRef.current = undefined;
    }
  }
}
