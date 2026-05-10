/**
 * Summary writer — produces `<run>/summary.md`. One artifact, two audiences.
 *
 * Headings are stable and predictable so an agent can grep for them and a
 * human can scan top-to-bottom. Heuristic auto-observations near the end
 * surface the most obvious things to look at (low scores, hard fails, parse
 * failures) without trying to be a full critique.
 */
import { writeFileSync } from 'node:fs';
import type {
  EvaluatorWorkerReport,
  EvaluatorRubricId,
} from '../../src/types/evaluation.ts';
import type { IncubationPlan } from '../../src/types/incubator.ts';
import type { RunDir } from './runDir.ts';
import type { LedgerEntry } from './cost.ts';

export interface PerHypothesisSummary {
  hypothesisId: string;
  name: string;
  artifactsDir: string;
  /** Path to the eval JSON file (relative to run root). */
  evalsPath?: string;
  reports?: Partial<Record<EvaluatorRubricId, EvaluatorWorkerReport>>;
  /** Stage error message, if any. */
  error?: string;
  /**
   * Verdict from the post-build honesty check (`runHonestyCheck`). Surfaces
   * hand-waving in bet-critical paths the build-side prompt rule may have
   * missed. `clean` / `minor` / `hollow` / `unknown` per `HonestyVerdict`.
   * Null when the run was a dry-run, the build produced no files, or the
   * honesty check itself errored — see `honestyError`.
   */
  honesty?: HonestyVerdictForSummary;
  honestyError?: string;
}

/** Inline copy of the HonestyVerdict shape — kept here so summary.ts stays decoupled from flow.ts module structure. */
export interface HonestyVerdictForSummary {
  verdict: 'clean' | 'minor' | 'hollow' | 'unknown';
  findings: Array<{
    file: string;
    line?: number;
    comment: string;
    isBetCritical: boolean;
    severity: 'ok' | 'minor' | 'hollow';
    explanation: string;
  }>;
}

export interface SectionOutput {
  /** e.g. 'research-context' or 'opportunity-reframe'. */
  id: string;
  /** Provenance of the content. Drives a small badge in the rendered output. */
  source: 'generated' | 'user-supplied' | 'regenerated';
  /** The actual section content. */
  content: string;
}

export interface RunSummaryInput {
  runDir: RunDir;
  flowName: string;
  briefId: string;
  briefPreview: string;
  providerId: string;
  modelId: string;
  evaluatorProviderId?: string;
  evaluatorModelId?: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  plan?: IncubationPlan;
  hypotheses: PerHypothesisSummary[];
  cost: LedgerEntry;
  /** Top-level error message that aborted the run, if any. */
  fatalError?: string;
  /** Free-form notes the flow function wants surfaced (e.g. "reframe inserted into spec"). */
  notes?: string[];
  /**
   * Generated or sourced spec sections. Rendered inline under "## Outputs" so
   * a reviewer can evaluate them without opening other files. Hypotheses live
   * in `plan.hypotheses` and are rendered separately.
   */
  sections?: SectionOutput[];
}

export function writeSummary(input: RunSummaryInput): void {
  const lines: string[] = [];
  lines.push(`# Run ${input.runDir.id}`, '');
  lines.push(`_Flow: **${input.flowName}** · brief: \`${input.briefId}\` · ${input.dryRun ? '**dry-run**' : 'live'}_`, '');

  // ── Config ────────────────────────────────────────────────────────────
  lines.push('## Config', '');
  lines.push(`- **provider**: ${input.providerId}`);
  lines.push(`- **model**: ${input.modelId}`);
  if (input.evaluatorProviderId || input.evaluatorModelId) {
    lines.push(
      `- **evaluator**: ${input.evaluatorProviderId ?? input.providerId} / ${input.evaluatorModelId ?? input.modelId}`,
    );
  }
  lines.push(`- **startedAt**: ${input.startedAt}`);
  lines.push(`- **finishedAt**: ${input.finishedAt}`);
  lines.push(`- **durationMs**: ${input.durationMs}`);
  lines.push(
    `- **tokens**: prompt=${input.cost.promptTokens} · completion=${input.cost.completionTokens} · total=${input.cost.totalTokens}`,
  );
  lines.push('');

  // ── Brief ─────────────────────────────────────────────────────────────
  lines.push('## Brief (excerpt)', '');
  lines.push('```text', truncate(input.briefPreview, 1200), '```', '');

  // ── Notes ─────────────────────────────────────────────────────────────
  if (input.notes && input.notes.length > 0) {
    lines.push('## Flow notes', '');
    for (const n of input.notes) lines.push(`- ${n}`);
    lines.push('');
  }

  // ── Fatal error ───────────────────────────────────────────────────────
  if (input.fatalError) {
    lines.push('## ❌ Fatal error', '');
    lines.push('```text', input.fatalError, '```', '');
  }

  // ── Outputs (section text inline) ─────────────────────────────────────
  if (input.sections && input.sections.length > 0) {
    lines.push('## Outputs', '');
    lines.push(
      '_Spec sections produced or sourced by this run. Read these to evaluate what the prompts actually wrote._',
      '',
    );
    for (const s of input.sections) {
      const badge = s.source === 'generated'
        ? '🤖 generated'
        : s.source === 'regenerated'
          ? '🔁 regenerated (user draft passed in as `<current_input_draft>`)'
          : '📄 user-supplied';
      lines.push(`### ${s.id} — _${badge}_`, '');
      lines.push(s.content.trim() || '_(empty)_', '');
    }
  }

  // ── Hypotheses ────────────────────────────────────────────────────────
  if (input.plan) {
    const dims = input.plan.dimensions ?? [];
    if (dims.length > 0) {
      lines.push('## Exploration axes', '');
      for (const d of dims) {
        lines.push(`- **${d.name}** (${d.isConstant ? 'constant' : 'variable'}): ${d.range}`);
      }
      lines.push('');
    }
    lines.push('## Hypotheses', '');
    if (input.plan.hypotheses.length === 0) {
      lines.push('_No hypotheses produced._', '');
    } else if (!input.dryRun) {
      lines.push(
        '_Click any hypothesis name to open its built artifact in your browser. See [`preview.html`](preview.html) for a gallery view._',
        '',
      );
    }
    for (const h of input.plan.hypotheses) {
      const artifactLink = !input.dryRun ? `artifacts/${h.id}/index.html` : null;
      const heading = artifactLink ? `### [${h.name}](${artifactLink})` : `### ${h.name}`;
      lines.push(heading, '');
      if (h.hypothesis) lines.push(`- **hypothesis**: ${h.hypothesis}`);
      if (h.rationale) lines.push(`- **rationale**: ${h.rationale}`);
      if (h.measurements) lines.push(`- **measurements**: ${h.measurements}`);
      const dimVals = Object.entries(h.dimensionValues ?? {});
      if (dimVals.length > 0) {
        lines.push(`- **positions**: ${dimVals.map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
      }
      const perHyp = input.hypotheses.find((p) => p.hypothesisId === h.id);
      if (perHyp?.error) {
        lines.push(`- **stage error**: \`${perHyp.error}\``);
      }
      if (perHyp?.evalsPath) {
        lines.push(`- **evaluation**: ${perHyp.evalsPath}`);
      }
      if (perHyp?.reports) {
        const cells = formatScoresLine(perHyp.reports);
        if (cells) lines.push(`- **scores**: ${cells}`);
      }
      if (perHyp?.honesty) {
        const v = perHyp.honesty.verdict;
        const icon = v === 'clean' ? '✅' : v === 'minor' ? '🟡' : v === 'hollow' ? '🔴' : '⚪';
        const findingCount = perHyp.honesty.findings.length;
        const detail = findingCount > 0 ? ` (${findingCount} finding${findingCount === 1 ? '' : 's'})` : '';
        lines.push(`- **honesty**: ${icon} ${v}${detail}`);
      } else if (perHyp?.honestyError) {
        lines.push(`- **honesty**: error — \`${perHyp.honestyError}\``);
      }
      if (artifactLink) {
        lines.push(`- **artifact**: [\`${artifactLink}\`](${artifactLink})`);
      }
      lines.push('');
    }
  }

  // ── Auto observations ────────────────────────────────────────────────
  const obs = autoObservations(input);
  if (obs.length > 0) {
    lines.push('## Auto observations', '');
    for (const o of obs) lines.push(`- ${o}`);
    lines.push('');
  }

  // ── Pointers ─────────────────────────────────────────────────────────
  lines.push('## Files in this run', '');
  lines.push('- `config.json` — flow + provider/model + prompt versions');
  lines.push('- `spec.md` — final assembled spec block sent to incubator');
  lines.push('- `hypotheses.json` — incubator output (parsed)');
  lines.push('- `transcripts/` — per-LLM-call prompt + response');
  lines.push('- `artifacts/<hyp-id>/` — generated static files');
  lines.push('- `evals/<hyp-id>.json` — rubric scores per hypothesis');
  lines.push('- `critique.md` — agent critique (placeholder until written)');
  lines.push('- `feedback.md` — human response to critique');
  lines.push('');

  writeFileSync(input.runDir.summary, lines.join('\n'));
}

function formatScoresLine(reports: Partial<Record<EvaluatorRubricId, EvaluatorWorkerReport>>): string {
  const parts: string[] = [];
  for (const [rubric, report] of Object.entries(reports)) {
    if (!report) continue;
    const avg = averageScore(report);
    const hf = report.hardFails?.length ?? 0;
    parts.push(`${rubric}=${avg != null ? avg.toFixed(2) : 'n/a'}${hf > 0 ? ` (${hf} hardFail)` : ''}`);
  }
  return parts.join(' · ');
}

function averageScore(report: EvaluatorWorkerReport): number | null {
  const scores = Object.values(report.scores ?? {});
  if (scores.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (const s of scores) {
    if (typeof s.score === 'number' && Number.isFinite(s.score)) {
      sum += s.score;
      count++;
    }
  }
  return count > 0 ? sum / count : null;
}

function autoObservations(input: RunSummaryInput): string[] {
  const out: string[] = [];
  if (input.dryRun) {
    out.push('Dry-run: no provider calls were made; transcripts contain composed prompts only.');
  }
  if (input.plan && input.plan.hypotheses.length === 0) {
    out.push('Incubator produced zero hypotheses.');
  }
  for (const h of input.hypotheses) {
    if (h.error) out.push(`\`${h.name}\` had a stage error: ${h.error}`);
    if (h.honesty?.verdict === 'hollow') {
      const betCriticalFindings = h.honesty.findings.filter((f) => f.isBetCritical && f.severity === 'hollow');
      const summary =
        betCriticalFindings.length > 0
          ? `${betCriticalFindings.length} bet-critical hand-waving site(s)`
          : 'flagged';
      out.push(`\`${h.name}\` honesty check: 🔴 hollow — ${summary}`);
    }
    const reports = h.reports;
    if (reports) {
      for (const [rubric, report] of Object.entries(reports)) {
        if (!report) continue;
        if ((report.hardFails?.length ?? 0) > 0) {
          out.push(`\`${h.name}\` / ${rubric}: ${report.hardFails.length} hardFail(s).`);
        }
        const avg = averageScore(report);
        if (avg != null && avg <= 2.0) {
          out.push(`\`${h.name}\` / ${rubric}: low average score ${avg.toFixed(2)}.`);
        }
      }
    }
  }
  return out;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…(${s.length - max} more chars)`;
}
