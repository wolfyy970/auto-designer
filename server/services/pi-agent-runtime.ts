/**
 * Pi agent runtime — single boundary between the host and `@auto-designer/pi`.
 *
 * Builds a Pi session via the package, then layers the host's event bridge and
 * LLM-log wrap on top of the returned `handle.session` so SSE consumers see
 * the host's `AgentRunEvent` shape and dev-time `/api/logs` records every
 * model turn.
 *
 * The function is composed from three pure helpers (`resolveProviderConfig`,
 * `dispatchSessionFactory`, `mapPackageResult`) so each piece is testable in
 * isolation.
 */
import { performance } from 'node:perf_hooks';
import {
  DefaultResourceLoader,
  PACKAGE_PROMPTS_DIR,
  PACKAGE_SKILLS_DIR,
  SANDBOX_PROJECT_ROOT,
  computeDesignFilesBeyondSeed,
  createDesignSession,
  createDesignSystemSession,
  createEvaluationSession,
  createIncubationSession,
  createInputsGenSession,
  loadDesignerSystemPrompt,
  type ResourceLoader,
  type SessionHandle,
  type ExtensionFactory,
  type SessionEvent,
  type SessionRunResult,
  type TodoItem,
} from '@auto-designer/pi';
import type { AgentRunEvent, AgentSessionParams, DesignAgentSessionResult } from './agent-runtime.ts';
import type { RunTraceEvent } from '../../src/types/provider.ts';
import { env } from '../env.ts';
import { normalizeError } from '../../src/lib/error-utils.ts';
import { normalizeProviderError } from '../lib/provider-error-normalize.ts';
import { FALLBACK_OPENROUTER_CONTEXT_WINDOW } from '../lib/completion-budget.ts';
import { getProviderModelContextWindow } from './provider-model-context.ts';
import { wrapPiStreamWithLogging, PI_LLM_LOG_PHASE, mapSessionTypeToLlmLogSource } from './pi-llm-log.ts';
import { subscribePiSessionBridge } from './pi-session-event-bridge.ts';

const NO_FILES_MESSAGE =
  'Agent completed without creating design files in the sandbox. Try a model that supports tool use, or ensure the bash tool runs successfully.';

type ProviderConfig =
  | { id: 'openrouter'; baseUrl: string; apiKey: string }
  | { id: 'lmstudio'; baseUrl: string };

type SessionFactoryOpts = Parameters<typeof createDesignSession>[0];

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Build the typed provider config + resolve the per-model context window.
 * Throws synchronously when the provider id is unsupported (no SSE has been
 * opened yet, so a thrown error is correct).
 */
export async function resolveProviderConfig(
  providerId: string,
  modelId: string,
): Promise<{ provider: ProviderConfig; contextWindow: number }> {
  if (providerId !== 'openrouter' && providerId !== 'lmstudio') {
    throw new Error(`pi-agent-runtime: unsupported provider "${providerId}"`);
  }
  const provider: ProviderConfig =
    providerId === 'openrouter'
      ? {
          id: 'openrouter',
          baseUrl: `${env.OPENROUTER_BASE_URL}/api/v1`,
          apiKey: env.OPENROUTER_API_KEY,
        }
      : { id: 'lmstudio', baseUrl: env.LMSTUDIO_URL };

  const registryCw = await getProviderModelContextWindow(providerId, modelId);
  const fallbackCw =
    providerId === 'lmstudio' ? env.LM_STUDIO_CONTEXT_WINDOW : FALLBACK_OPENROUTER_CONTEXT_WINDOW;
  return { provider, contextWindow: registryCw ?? fallbackCw };
}

/**
 * Pick the right package session factory by session type. Only `design`
 * accepts seedFiles (revision rounds); the rest are zero-seed by contract.
 */
export function dispatchSessionFactory(
  sessionType: AgentSessionParams['sessionType'],
  baseOpts: SessionFactoryOpts,
  seedFiles?: Record<string, string>,
): Promise<SessionHandle> {
  switch (sessionType) {
    case 'evaluation':
      return createEvaluationSession(baseOpts);
    case 'incubation':
      return createIncubationSession(baseOpts);
    case 'inputs-gen':
      return createInputsGenSession(baseOpts);
    case 'design-system':
      return createDesignSystemSession(baseOpts);
    case 'design':
    default:
      return createDesignSession({ ...baseOpts, seedFiles });
  }
}

/**
 * Map a package `SessionRunResult` into the host's outcome shape, taking
 * revision-round seed diffing into account. Pure function — no SSE side
 * effects; the orchestrator decides how to surface `{ ok: false }`.
 */
export type PiRunOutcome =
  | { ok: true; result: DesignAgentSessionResult }
  | { ok: false; reason: 'no_files'; message: string };

export function mapPackageResult(
  result: SessionRunResult,
  seedFiles: Record<string, string> | undefined,
): PiRunOutcome {
  const hasRevisionSeed = !!seedFiles && Object.keys(seedFiles).length > 0;
  const outputVsSeed = hasRevisionSeed
    ? computeDesignFilesBeyondSeed(result.files, seedFiles)
    : result.files;

  if (Object.keys(outputVsSeed).length === 0 && !result.aborted) {
    return { ok: false, reason: 'no_files', message: NO_FILES_MESSAGE };
  }

  return {
    ok: true,
    result: {
      files: result.files,
      todos: result.todos,
      emittedFilePaths: result.emittedFilePaths,
    },
  };
}

// ── Internal: package resource loader ──────────────────────────────────────

function buildPackageResourceLoader(input: {
  systemPrompt: string;
  extensionFactories: ExtensionFactory[];
  cwd: string;
}): Promise<ResourceLoader> {
  const loader = new DefaultResourceLoader({
    cwd: input.cwd,
    /** Required since Pi 0.72 even when project-local discovery is disabled. */
    agentDir: input.cwd,
    /** Disable project-local discovery — we point at the package's bundled paths instead. */
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    extensionFactories: input.extensionFactories,
    additionalSkillPaths: [PACKAGE_SKILLS_DIR],
    additionalPromptTemplatePaths: [PACKAGE_PROMPTS_DIR],
    systemPrompt: input.systemPrompt,
  });
  return Promise.resolve(loader).then(async (l) => {
    await l.reload();
    return l;
  });
}

function createTraceEvent(
  kind: RunTraceEvent['kind'],
  label: string,
  extra: Partial<RunTraceEvent> = {},
): AgentRunEvent {
  return {
    type: 'trace',
    trace: {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind,
      label,
      status: 'info',
      ...extra,
    },
  };
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function runPiAgentSession(
  params: AgentSessionParams,
  onEvent: (event: AgentRunEvent) => void | Promise<void>,
): Promise<DesignAgentSessionResult | null> {
  // Throws synchronously — no SSE is open yet.
  const { provider, contextWindow } = await resolveProviderConfig(
    params.providerId,
    params.modelId,
  );

  const startMessage = params.initialProgressMessage ?? 'Starting agentic generation...';
  await onEvent({ type: 'progress', payload: startMessage });
  await onEvent(createTraceEvent('run_started', startMessage, { phase: 'building' }));

  const systemPromptBody = (params.systemPrompt?.trim() || loadDesignerSystemPrompt()).trim();

  const onFile = (path: string, content: string) => {
    void onEvent({ type: 'file', path, content });
    void onEvent(
      createTraceEvent('file_written', `Saved ${path}`, {
        phase: 'building',
        path,
        status: 'success',
      }),
    );
  };
  const onTodos = (todos: TodoItem[]) => {
    void onEvent({ type: 'todos', todos });
  };
  const onPackageEvent = (e: SessionEvent) => {
    if (e.type === 'agent_end' && e.errorMessage) {
      void onEvent({ type: 'error', payload: e.errorMessage });
    }
  };

  const baseOpts: SessionFactoryOpts = {
    provider,
    modelId: params.modelId,
    contextWindow,
    thinkingLevel: params.thinkingLevel,
    systemPrompt: systemPromptBody,
    userPrompt: params.userPrompt,
    signal: params.signal,
    correlationId: params.correlationId,
    onFile,
    onTodos,
    onEvent: onPackageEvent,
    buildResourceLoader: ({ extensionFactories }) =>
      buildPackageResourceLoader({
        systemPrompt: systemPromptBody,
        extensionFactories,
        cwd: SANDBOX_PROJECT_ROOT,
      }),
  };

  const handle = await dispatchSessionFactory(params.sessionType, baseOpts, params.seedFiles);

  // Wrap streamFn with the host's LLM-log sink.
  const llmTurnLogRef: { current?: string } = {};
  const prevStream = handle.session.agent.streamFn;
  handle.session.agent.streamFn = wrapPiStreamWithLogging(prevStream, {
    providerId: params.providerId,
    modelId: params.modelId,
    source: mapSessionTypeToLlmLogSource(params.sessionType),
    phase: params.phase === 'revision' ? PI_LLM_LOG_PHASE.REVISION : PI_LLM_LOG_PHASE.AGENTIC_TURN,
    turnLogRef: llmTurnLogRef,
    correlationId: params.correlationId,
  });

  // Layer the host's rich AgentRunEvent bridge on top.
  const unsubscribeBridge = subscribePiSessionBridge(handle.session, {
    onEvent,
    trace: createTraceEvent,
    toolPathByCallId: new Map<string, string | undefined>(),
    toolArgsByCallId: new Map<string, string | undefined>(),
    waitingForFirstToken: { current: false },
    turnLogRef: llmTurnLogRef,
    streamActivityAt: { current: Date.now() },
    modelTurnId: { current: 0 },
    pendingToolCallsRef: { current: 0 },
    onStreamDeliveryFailure: () => handle.session.agent.abort(),
  });

  if (env.isDev) {
    console.debug('[pi-agent-runtime] session start', {
      correlationId: params.correlationId,
      provider: params.providerId,
      model: params.modelId,
      contextWindow,
      seedFileCount: params.seedFiles ? Object.keys(params.seedFiles).length : 0,
      sessionType: params.sessionType,
    });
  }

  let result: SessionRunResult;
  try {
    const t0 = performance.now();
    result = await handle.run();
    if (env.isDev) {
      console.debug('[pi-agent-runtime] session done', {
        correlationId: params.correlationId,
        durationMs: Math.round(performance.now() - t0),
        fileCount: Object.keys(result.files).length,
        todoCount: result.todos.length,
        aborted: result.aborted,
      });
    }
  } catch (err) {
    if (env.isDev) {
      console.error('[pi-agent-runtime] handle.run failed', normalizeError(err), err);
    }
    await onEvent({ type: 'error', payload: `Agent error: ${normalizeProviderError(err)}` });
    return null;
  } finally {
    unsubscribeBridge();
  }

  if (result.errorMessage) {
    await onEvent({ type: 'error', payload: result.errorMessage });
  }

  const outcome = mapPackageResult(result, params.seedFiles);
  if (!outcome.ok) {
    await onEvent({ type: 'error', payload: outcome.message });
    return null;
  }
  return outcome.result;
}
