/**
 * Canonical Pi-message inspector used at every Pi SDK boundary in the host
 * (event bridge, LLM-log formatter, stream budget). Keeps `as` casts and
 * structural duck-typing in one file so a Pi SDK shape change fails in one
 * place instead of drifting at three sites.
 */
import type { AssistantMessage } from '@auto-designer/pi';
import { extractPiToolPathFromArguments } from './pi-tool-args.ts';

// ── Discriminated content-part predicates (assistant + user/tool-result) ──

/** Pi assistant `TextContent`. */
export function isTextPart(p: unknown): p is { type: 'text'; text: string } {
  return p !== null && typeof p === 'object' && (p as { type?: unknown }).type === 'text'
    && typeof (p as { text?: unknown }).text === 'string';
}

/** Pi assistant `ThinkingContent`. */
export function isThinkingPart(p: unknown): p is { type: 'thinking'; thinking: string } {
  return p !== null && typeof p === 'object' && (p as { type?: unknown }).type === 'thinking'
    && typeof (p as { thinking?: unknown }).thinking === 'string';
}

/** Pi user/toolResult `ImageContent`. */
export function isImagePart(p: unknown): p is { type: 'image'; data: string } {
  return p !== null && typeof p === 'object' && (p as { type?: unknown }).type === 'image'
    && typeof (p as { data?: unknown }).data === 'string';
}

/** Pi assistant `ToolCall` (tool name + arguments). */
export function isToolCallPart(p: unknown): p is {
  type: 'toolCall';
  id?: string;
  name: string;
  arguments?: Record<string, unknown>;
} {
  if (p === null || typeof p !== 'object') return false;
  if ((p as { type?: unknown }).type !== 'toolCall') return false;
  return typeof (p as { name?: unknown }).name === 'string';
}

/** Pi assistant message content slice when type is `toolCall`. */
export function parseToolCallFromAssistantSlice(slice: unknown): { toolName: string; toolPath?: string } {
  if (slice === null || typeof slice !== 'object' || !('type' in slice)) {
    return { toolName: 'tool' };
  }
  const type = (slice as { type?: unknown }).type;
  if (type !== 'toolCall') {
    return { toolName: 'tool' };
  }
  const obj = slice as Record<string, unknown>;
  const name = obj.name;
  const args = obj.arguments;
  const toolName = typeof name === 'string' && name.length > 0 ? name : 'tool';
  const argumentsObj =
    args !== null && typeof args === 'object' && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : undefined;
  const toolPath =
    argumentsObj != null ? extractPiToolPathFromArguments(argumentsObj) : undefined;
  return { toolName, ...(toolPath != null ? { toolPath } : {}) };
}

export function toolMetaFromPartialNarrowed(
  partial: AssistantMessage,
  contentIndex: number,
): { toolName: string; toolPath?: string } {
  const slice = partial.content[contentIndex];
  return parseToolCallFromAssistantSlice(slice);
}

/** Only the tool path from a partial message slice (cheaper than full meta when only path may arrive late). */
export function extractToolPathFromAssistantPartial(
  partial: AssistantMessage,
  contentIndex: number,
): string | undefined {
  return toolMetaFromPartialNarrowed(partial, contentIndex).toolPath;
}

/** `toolcall_end` payload — narrowed without `as` on Pi SDK toolCall. */
export function parsePiToolCallEnd(
  toolCall: unknown,
): { name?: string; arguments?: Record<string, unknown> } | null {
  if (toolCall === null || typeof toolCall !== 'object' || Array.isArray(toolCall)) {
    return null;
  }
  const o = toolCall as Record<string, unknown>;
  const name = o.name;
  const args = o.arguments;
  const out: { name?: string; arguments?: Record<string, unknown> } = {};
  if (typeof name === 'string') out.name = name;
  if (args !== null && typeof args === 'object' && !Array.isArray(args)) {
    out.arguments = args as Record<string, unknown>;
  }
  return out;
}

export function toolPathFromNarrowedToolCall(tc: {
  name?: string;
  arguments?: Record<string, unknown>;
}): string | undefined {
  return extractPiToolPathFromArguments(tc.arguments);
}

/** `tool_execution_start` args — safe record for trace serialization. */
export function parseUnknownArgsRecord(args: unknown): Record<string, unknown> | undefined {
  if (args === null || args === undefined) return undefined;
  if (typeof args !== 'object' || Array.isArray(args)) return undefined;
  return args as Record<string, unknown>;
}

/** Pi compaction `result.details` — optional file lists for trace detail lines. */
export function parseCompactionDetails(
  details: unknown,
): { readFiles?: string[]; modifiedFiles?: string[] } | undefined {
  if (details === null || typeof details !== 'object' || Array.isArray(details)) return undefined;
  const d = details as Record<string, unknown>;
  const readFiles = d.readFiles;
  const modifiedFiles = d.modifiedFiles;
  const out: { readFiles?: string[]; modifiedFiles?: string[] } = {};
  if (Array.isArray(readFiles) && readFiles.every((x) => typeof x === 'string')) {
    out.readFiles = readFiles;
  }
  if (Array.isArray(modifiedFiles) && modifiedFiles.every((x) => typeof x === 'string')) {
    out.modifiedFiles = modifiedFiles;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
