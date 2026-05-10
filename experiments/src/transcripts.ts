/**
 * Per-stage transcript writer. One markdown file per LLM call (or dry-run
 * compose) under `<run>/transcripts/NN-stage.md`, with stable headings the
 * agent can grep.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunDir } from './runDir.ts';

export interface TranscriptUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedPromptTokens?: number;
  costCredits?: number;
}

export interface TranscriptInput {
  /** Two-digit ordinal prefix (e.g. `01`, `02`) — drives chronological ordering. */
  ordinal: number;
  /** Short slug used in the filename, e.g. `research`, `incubator`, `build-h1`. */
  slug: string;
  /** Human title for the markdown header. */
  title: string;
  /** Provider id (`openrouter`, `lmstudio`). */
  providerId: string;
  /** Model id passed to the provider. */
  modelId: string;
  /** Session type when the call ran inside the Pi sandbox; otherwise `'direct-llm'` or `'dry-run'`. */
  sessionType?: string;
  /** Messages sent to the provider. */
  systemPrompt: string;
  userPrompt: string;
  /** Raw response text from the provider. Empty for dry-run. */
  response?: string;
  /** Wall-clock duration in ms. Empty for dry-run. */
  durationMs?: number;
  /** Token / cost usage from provider response, when available. */
  usage?: TranscriptUsage;
  /** Error message when a stage failed; truthy presence flips the file marker. */
  error?: string;
  /** Free-form notes (e.g. "skipped (dry-run)" or "result extracted from result.json"). */
  notes?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fence(label: string, body: string): string {
  return `\n\`\`\`${label}\n${body}\n\`\`\`\n`;
}

function formatUsage(u: TranscriptUsage | undefined): string {
  if (!u) return '_no usage reported_';
  const parts: string[] = [];
  if (u.promptTokens != null) parts.push(`prompt: ${u.promptTokens}`);
  if (u.completionTokens != null) parts.push(`completion: ${u.completionTokens}`);
  if (u.totalTokens != null) parts.push(`total: ${u.totalTokens}`);
  if (u.reasoningTokens != null) parts.push(`reasoning: ${u.reasoningTokens}`);
  if (u.cachedPromptTokens != null) parts.push(`cached: ${u.cachedPromptTokens}`);
  if (u.costCredits != null) parts.push(`cost: ${u.costCredits}`);
  return parts.length > 0 ? parts.join(' · ') : '_no usage reported_';
}

export interface WrittenTranscript {
  ordinal: number;
  slug: string;
  filename: string;
  path: string;
}

export function writeTranscript(runDir: RunDir, input: TranscriptInput): WrittenTranscript {
  const filename = `${pad2(input.ordinal)}-${input.slug}.md`;
  const path = join(runDir.transcripts, filename);
  const status = input.error ? 'ERROR' : input.response != null ? 'OK' : 'COMPOSED';
  const sections: string[] = [
    `# ${input.title}`,
    '',
    `- **status**: ${status}`,
    `- **provider**: ${input.providerId}`,
    `- **model**: ${input.modelId}`,
    input.sessionType ? `- **sessionType**: ${input.sessionType}` : '',
    input.durationMs != null ? `- **durationMs**: ${input.durationMs}` : '',
    `- **usage**: ${formatUsage(input.usage)}`,
    input.notes ? `- **notes**: ${input.notes}` : '',
    '',
    '## System prompt',
    fence('text', input.systemPrompt || '(empty)'),
    '## User prompt',
    fence('text', input.userPrompt || '(empty)'),
  ];

  if (input.error) {
    sections.push('## Error', fence('text', input.error));
  } else if (input.response != null) {
    sections.push('## Response', fence('text', input.response));
  } else {
    sections.push(
      '## Response',
      '_No response — this stage was composed but not sent to a provider (dry-run)._',
    );
  }

  writeFileSync(path, sections.filter((s) => s !== '').join('\n'));
  return { ordinal: input.ordinal, slug: input.slug, filename, path };
}
