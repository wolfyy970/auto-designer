/**
 * Agentic build orchestrator — CURRENTLY INACTIVE.
 *
 * This module implements a multi-turn LLM build loop where the model writes
 * files into a VirtualWorkspace via XML tool calls. It was replaced by
 * single-shot generation (genSystemHtml) which is more reliable across
 * different model providers.
 *
 * Preserved for future use — the approach is architecturally sound but
 * requires models that reliably produce structured tool calls.
 */

import { VirtualWorkspace } from './workspace';
import { logLlmCall } from '../../stores/log-store';
import type { GenerationProvider } from '../../types/provider';
import type { ProviderOptions } from '../../types/provider';
import type { ChatMessage } from '../../types/provider';

// ── Local tool-calling types (moved here; only this inactive module uses them) ──

class AgentToolError extends Error {
  readonly toolName?: string;
  constructor(message: string, toolName?: string) {
    super(message);
    this.name = 'AgentToolError';
    this.toolName = toolName;
  }
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface ToolChatResponse {
  toolCalls: ToolCall[];
  text?: string;
}

/** Extended provider interface for tool-capable models (local to this inactive module). */
interface ToolCapableProvider extends GenerationProvider {
  generateWithTools?(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ProviderOptions
  ): Promise<ToolChatResponse>;
}

// ── Build plan types ─────────────────────────────────────────────────

interface BuildPlanFile {
  path: string;
  responsibility: string;
  key_decisions: string[];
}

interface BuildPlan {
  intent: string;
  palette: Record<string, string>;
  typography: Record<string, string>;
  layout: string;
  files: BuildPlanFile[];
}

// ── Tool definitions (used for both native and XML paths) ────────────

const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'write_file',
    description: 'Create or overwrite a file in the virtual workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to workspace root (e.g. "index.html")' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace a specific block of text in an existing file.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to edit' },
        old_string: { type: 'string', description: 'Exact text to find and replace' },
        new_string: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the current content of a file from the workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'finish_build',
    description: 'Signal that all planned files have been written and the build is complete.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// ── Planning pass ────────────────────────────────────────────────────

async function runPlanningPass(
  plannerSystemPrompt: string,
  userPromptContext: string,
  provider: ToolCapableProvider,
  providerOptions: ProviderOptions,
  onProgress?: (status: string) => void
): Promise<BuildPlan | null> {
  onProgress?.('Planning build...');
  const messages: ChatMessage[] = [
    { role: 'system', content: plannerSystemPrompt },
    { role: 'user', content: userPromptContext },
  ];
  const t0 = performance.now();
  const response = await provider.generateChat(messages, providerOptions);
  const durationMs = Math.round(performance.now() - t0);
  try {
    const plan = JSON.parse(response.raw) as BuildPlan;
    logLlmCall({
      source: 'planner',
      model: providerOptions.model ?? 'unknown',
      provider: provider.id,
      systemPrompt: plannerSystemPrompt,
      userPrompt: userPromptContext,
      response: response.raw,
      durationMs,
    });
    onProgress?.(`Plan ready: ${plan.files.length} files — ${plan.intent}`);
    return plan;
  } catch {
    logLlmCall({
      source: 'planner',
      model: providerOptions.model ?? 'unknown',
      provider: provider.id,
      systemPrompt: plannerSystemPrompt,
      userPrompt: userPromptContext,
      response: response.raw,
      durationMs,
      error: 'Failed to parse plan JSON',
    });
    onProgress?.('Warning: Could not parse build plan. Proceeding without plan.');
    return null;
  }
}

function formatPlanContext(plan: BuildPlan): string {
  const files = plan.files
    .map((f, i) => `  ${i + 1}. ${f.path} — ${f.responsibility}`)
    .join('\n');
  const paletteEntries = Object.entries(plan.palette)
    .filter(([k]) => k !== 'rationale')
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n');
  const typographyEntries = Object.entries(plan.typography)
    .filter(([k]) => k !== 'rationale')
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n');

  return `<build_plan>
<intent>${plan.intent}</intent>
<palette>
${paletteEntries}
</palette>
<typography>
${typographyEntries}
</typography>
<layout>${plan.layout}</layout>
<files>
${files}
</files>
<instruction>Write each file from the list above, in order, one per response. After writing the last file, call finish_build.</instruction>
</build_plan>`;
}

// ── Workspace-aware feedback ─────────────────────────────────────────

function formatWorkspaceStatus(workspace: VirtualWorkspace, plan: BuildPlan | null): string {
  const written = workspace.listFiles();
  if (written.length === 0 && !plan) return '';

  const lines: string[] = ['', 'Workspace:'];
  const plannedPaths = plan?.files.map((f) => f.path) ?? [];

  if (plannedPaths.length > 0) {
    for (const p of plannedPaths) {
      const done = written.includes(p);
      lines.push(`  ${done ? '✓' : '○'} ${p}  (${done ? 'written' : 'pending'})`);
    }
    const remaining = plannedPaths.filter((p) => !written.includes(p));
    if (remaining.length > 0) {
      lines.push(`\nNext: write ${remaining[0]}${remaining.length > 1 ? `, then ${remaining.slice(1).join(', ')}` : ''}, then call finish_build.`);
    }
  } else {
    for (const p of written) {
      lines.push(`  ✓ ${p}  (written)`);
    }
  }

  return lines.join('\n');
}

// ── Thinking extraction (for activity log) ──────────────────────────

/** Extract model's prose/thinking text before any tool calls or code blocks. */
function extractThinking(raw: string): string {
  // Strip everything from the first XML tool tag or markdown code fence onwards
  const cutPoints = [
    raw.search(/<write_file\s/),
    raw.search(/<edit_file\s/),
    raw.search(/<read_file\s/),
    raw.search(/<finish_build/),
    raw.search(/```\w/),
  ].filter((i) => i >= 0);

  const text = cutPoints.length > 0
    ? raw.slice(0, Math.min(...cutPoints))
    : raw;

  // Clean up and truncate
  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return '';
  return cleaned.length > 300 ? cleaned.slice(0, 297) + '…' : cleaned;
}

// ── XML fallback parser ──────────────────────────────────────────────

function extractToolCalls(response: string, activePlan: BuildPlan | null): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // 1. Strict XML parsing
  const writeRegex = /<write_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/write_file>/g;
  let match: RegExpExecArray | null;
  while ((match = writeRegex.exec(response)) !== null) {
    toolCalls.push({ name: 'write_file', args: { path: match[1], content: match[2].trim() } });
  }

  const editRegex = /<edit_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/edit_file>/g;
  while ((match = editRegex.exec(response)) !== null) {
    const editBody = match[2];
    const searchMatch = /<search>([\s\S]*?)<\/search>/.exec(editBody);
    const replaceMatch = /<replace>([\s\S]*?)<\/replace>/.exec(editBody);
    if (searchMatch && replaceMatch) {
      toolCalls.push({
        name: 'edit_file',
        args: { path: match[1], old_string: searchMatch[1], new_string: replaceMatch[1] },
      });
    }
  }

  const readRegex = /<read_file\s+path=["']([^"']+)["']\s*\/?>/g;
  while ((match = readRegex.exec(response)) !== null) {
    toolCalls.push({ name: 'read_file', args: { path: match[1] } });
  }

  // 2. Permissive Fallback for models (like Gemini) that ignore XML and write Markdown
  if (toolCalls.filter((c) => c.name === 'write_file' || c.name === 'edit_file').length === 0) {
    const markdownRegex = /```(\w*)[ \t]*?\n([\s\S]*?)```/g;
    while ((match = markdownRegex.exec(response)) !== null) {
      const lang = match[1].toLowerCase();
      const code = match[2].trim();
      if (!code) continue;

      let path = '';
      if (lang === 'html') path = 'index.html';
      else if (lang === 'css') path = 'styles.css';
      else if (lang === 'js' || lang === 'javascript') path = 'script.js';
      else path = `file.${lang || 'txt'}`;

      // Try to align the inferred path with what the planner promised
      if (activePlan?.files) {
        const plannedMatch = activePlan.files.find((f) => f.path.endsWith(`.${lang}`));
        if (plannedMatch) path = plannedMatch.path;
      }

      toolCalls.push({ name: 'write_file', args: { path, content: code } });
    }
  }

  // 3. Check for finish_build LAST so that writes are processed first
  const finishRegex = /<finish_build\s*\/?>(?:<\/finish_build>)?/;
  if (finishRegex.test(response)) {
    toolCalls.push({ name: 'finish_build', args: {} });
  }

  return toolCalls;
}

// ── Tool dispatch (shared between native and XML paths) ──────────────

interface DispatchResult {
  feedback: string;
  finished: boolean;
  readContent?: string;
}

function dispatchToolCall(
  call: ToolCall,
  workspace: VirtualWorkspace,
  plan: BuildPlan | null,
  onProgress?: (status: string) => void
): DispatchResult {
  try {
    if (call.name === 'write_file') {
      const { path, content } = call.args as { path: string; content: string };
      workspace.writeFile(path, content);
      const lineCount = (content.match(/\n/g) ?? []).length + 1;
      const status = formatWorkspaceStatus(workspace, plan);
      const feedback = `✓ ${path} written (${lineCount} lines)${status}`;
      onProgress?.(`Wrote ${path}`);
      return { feedback, finished: false };
    }

    if (call.name === 'edit_file') {
      const { path, old_string, new_string } = call.args as { path: string; old_string: string; new_string: string };
      const success = workspace.patchFile(path, old_string, new_string);
      if (!success) {
        throw new AgentToolError(`File not found: ${path}`, 'edit_file');
      }
      const feedback = `✓ ${path} patched`;
      onProgress?.(`Patched ${path}`);
      return { feedback, finished: false };
    }

    if (call.name === 'read_file') {
      const { path } = call.args as { path: string };
      const content = workspace.readFile(path);
      if (!content) {
        throw new AgentToolError(`File not found: ${path}`, 'read_file');
      }
      return { feedback: '', finished: false, readContent: content };
    }

    if (call.name === 'finish_build') {
      onProgress?.('Build complete. Assembling output...');
      return { feedback: 'Build finished.', finished: true };
    }

    return { feedback: `Unknown tool: ${call.name}`, finished: false };
  } catch (error) {
    const toolName = call.name;
    if (error instanceof AgentToolError) {
      return { feedback: `Tool \`${error.toolName}\` FAILED: ${error.message}`, finished: false };
    }
    return { feedback: `Tool \`${toolName}\` FAILED: ${String(error)}`, finished: false };
  }
}

// ── Main export ──────────────────────────────────────────────────────

export interface AgenticBuildOptions {
  model: string;
  supportsVision?: boolean;
  maxLoops?: number;
  plannerSystemPrompt?: string;
  onProgress?: (status: string) => void;
  /** Rich activity log entries for live UI display (thinking, file writes, etc.) */
  onActivity?: (entry: string) => void;
}

export async function runAgenticBuild(
  builderSystemPrompt: string,
  userPromptContext: string,
  provider: ToolCapableProvider,
  options: AgenticBuildOptions
): Promise<VirtualWorkspace> {
  const workspace = new VirtualWorkspace();
  const maxLoops = options.maxLoops ?? 15;
  let loops = 0;
  let isFinished = false;
  let activePlan: BuildPlan | null = null;

  const providerOptions: ProviderOptions = {
    model: options.model,
    supportsVision: options.supportsVision,
  };

  const useNativeTools = typeof provider.generateWithTools === 'function';

  // ── Planning pass ────────────────────────────────────────────────
  let buildPlanContext = '';
  if (options.plannerSystemPrompt) {
    activePlan = await runPlanningPass(
      options.plannerSystemPrompt,
      userPromptContext,
      provider,
      providerOptions,
      options.onProgress
    );
    if (activePlan) {
      buildPlanContext = '\n\n' + formatPlanContext(activePlan);
      options.onActivity?.(`Plan: ${activePlan.intent}`);
      for (const f of activePlan.files) {
        options.onActivity?.(`  ○ ${f.path} — ${f.responsibility}`);
      }
    }
  }

  // ── Build loop ───────────────────────────────────────────────────
  const messages: ChatMessage[] = [
    { role: 'system', content: builderSystemPrompt },
    { role: 'user', content: userPromptContext + buildPlanContext },
  ];

  options.onProgress?.('Starting build...');

  while (!isFinished && loops < maxLoops) {
    options.onProgress?.(`Build loop ${loops + 1}/${maxLoops}...`);

    let toolCalls: ToolCall[];
    let rawAssistantContent: string;
    const loopT0 = performance.now();

    if (useNativeTools) {
      const response = await provider.generateWithTools!(messages, AGENT_TOOLS, providerOptions);
      rawAssistantContent = response.text ?? '';
      toolCalls = response.toolCalls;

      messages.push({ role: 'assistant', content: rawAssistantContent || '[tool call]' });
    } else {
      const response = await provider.generateChat(messages, providerOptions);
      rawAssistantContent = response.raw;
      toolCalls = extractToolCalls(response.raw, activePlan);

      if (import.meta.env.DEV) {
        const preview = rawAssistantContent.slice(0, 300).replace(/\n/g, ' ');
        console.log(`[Orchestrator loop ${loops + 1}] tool calls found: ${toolCalls.length} | response preview: ${preview}`);
        if (toolCalls.length === 0) {
          console.warn(`[Orchestrator loop ${loops + 1}] NO TOOL CALLS — full response:`, rawAssistantContent);
        }
      }

      messages.push({ role: 'assistant', content: rawAssistantContent });
    }

    // Log the build loop LLM call
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    logLlmCall({
      source: 'builder',
      phase: `Loop ${loops + 1}/${maxLoops}`,
      model: options.model,
      provider: provider.id,
      systemPrompt: builderSystemPrompt,
      userPrompt: typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '[multipart]',
      response: rawAssistantContent,
      durationMs: Math.round(performance.now() - loopT0),
      toolCalls: toolCalls.map((tc) => ({
        name: tc.name,
        path: (tc.args as Record<string, unknown>).path as string | undefined,
      })),
    });

    // Emit model thinking to activity log
    const thinking = extractThinking(rawAssistantContent);
    if (thinking) {
      options.onActivity?.(thinking);
    }

    if (toolCalls.length === 0) {
      messages.push({
        role: 'user',
        content: useNativeTools
          ? 'Please use the provided tools to write files or call finish_build when done.'
          : 'Warning: You did not output any valid tool calls. Use <write_file path="...">, <edit_file path="...">, or <finish_build/>.',
      });
    } else {
      let turnFeedback = '';
      const writtenThisTurn: string[] = [];

      for (const call of toolCalls) {
        options.onProgress?.(`Executing: ${call.name}...`);
        const result = dispatchToolCall(call, workspace, activePlan, options.onProgress);

        if (result.readContent !== undefined) {
          const path = (call.args as { path: string }).path;
          messages.push({ role: 'user', content: `Contents of ${path}:\n\n${result.readContent}` });
          options.onActivity?.(`Read ${path}`);
          continue;
        }

        if (result.finished) {
          options.onActivity?.('\u2713 Build complete');
          isFinished = true;
          break;
        }

        // Emit file operations to activity log
        if (call.name === 'write_file') {
          const { path: fpath, content: fcontent } = call.args as { path: string; content: string };
          const lineCount = (fcontent.match(/\n/g) ?? []).length + 1;
          options.onActivity?.(`\u2713 Wrote ${fpath} (${lineCount} lines)`);
        } else if (call.name === 'edit_file') {
          options.onActivity?.(`\u270E Patched ${(call.args as { path: string }).path}`);
        }

        if (result.feedback.includes('FAILED')) {
          options.onActivity?.(`\u2717 ${result.feedback}`);
        }

        turnFeedback += result.feedback + '\n';
        if (call.name === 'write_file') {
          writtenThisTurn.push((call.args as { path: string }).path);
        }
      }

      // Context compression: if the turn was all successful writes, replace the
      // verbose assistant turn with a compact summary so it doesn't bloat context.
      if (writtenThisTurn.length > 0 && !turnFeedback.includes('FAILED')) {
        messages[messages.length - 1] = {
          role: 'assistant',
          content: `[wrote ${writtenThisTurn.join(', ')}]`,
        };
      }

      if (!isFinished && turnFeedback.trim()) {
        messages.push({
          role: 'user',
          content: turnFeedback.trim() + '\nContinue building. Read your errors and correct them if needed.',
        });
      }
    }

    loops++;

    // ── Validation correction pass ────────────────────────────────
    if (isFinished && activePlan) {
      const plannedPaths = activePlan.files.map((f) => f.path);
      const validation = workspace.validateWorkspace(plannedPaths);
      if (!validation.valid && loops < maxLoops) {
        isFinished = false;
        const missing = validation.missingFiles.join(', ');
        messages.push({
          role: 'user',
          content: `The following planned files were not written: ${missing}. Write them now, or call finish_build if they are not needed.`,
        });
        options.onProgress?.(`Validation: missing ${missing}. Requesting correction...`);
      }
    }
  }

  if (!isFinished) {
    options.onProgress?.(`Warning: Build reached max loops (${maxLoops}) without finish_build.`);
  }

  if (import.meta.env.DEV) {
    const files = workspace.listFiles();
    console.log(`[Orchestrator] Build ended. workspace files: [${files.join(', ') || 'NONE'}]`);
    if (files.length === 0) {
      console.error('[Orchestrator] No files were written. The model likely did not use XML tool tags.');
    }
  }

  return workspace;
}
