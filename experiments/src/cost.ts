/**
 * Cost tracking + caps for experiments.
 *
 * Two layers:
 *  - **Per-run cap** — tokens accumulated across stages of one run. When
 *    crossed, the next stage refuses to start. Partial outputs are preserved.
 *  - **Daily cap** — tokens summed across runs in the last 24h, persisted to
 *    `experiments/.cost-ledger.jsonl`. Reads on every run start; refuses if
 *    crossed.
 *
 * Token estimation is rough — char-based heuristic before sending, real usage
 * reconciled from provider response. Imperfect; signal not precision.
 */
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { TranscriptUsage } from './transcripts.ts';

export const DEFAULT_PER_RUN_TOKEN_CAP = 200_000;
export const DEFAULT_DAILY_TOKEN_CAP = 1_000_000;

export interface LedgerEntry {
  ts: string; // ISO timestamp
  runId: string;
  flowName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class CostCapExceededError extends Error {
  constructor(
    message: string,
    readonly scope: 'per-run' | 'daily',
  ) {
    super(message);
    this.name = 'CostCapExceededError';
  }
}

export class CostTracker {
  private prompt = 0;
  private completion = 0;
  /** Char-based pre-send estimate accumulator (used when provider returns no usage). */
  private estimatedTotal = 0;

  constructor(
    private readonly perRunCap: number,
    private readonly runId: string,
    private readonly flowName: string,
    private readonly ledgerPath: string,
  ) {}

  /** Cheap pre-send estimate so dry-run stays meaningful. ~4 chars/token. */
  static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Throw if the about-to-run stage would push the run past the per-run cap
   * by an estimated amount. Real usage is recorded post-call via {@link recordUsage}.
   */
  assertCapacity(estimatedAdd: number): void {
    const projected = this.totalSoFar() + estimatedAdd;
    if (projected > this.perRunCap) {
      throw new CostCapExceededError(
        `Per-run token cap (${this.perRunCap}) would be exceeded: ${this.totalSoFar()} used + ~${estimatedAdd} estimated > ${this.perRunCap}. Use --cap-tokens N to raise.`,
        'per-run',
      );
    }
  }

  recordUsage(usage: TranscriptUsage | undefined, fallbackEstimate: number): void {
    if (usage && usage.totalTokens != null) {
      if (usage.promptTokens != null) this.prompt += usage.promptTokens;
      if (usage.completionTokens != null) this.completion += usage.completionTokens;
      // When totalTokens > prompt+completion (e.g. reasoning), keep totals honest:
      const accountedTotal = (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);
      if (usage.totalTokens > accountedTotal) {
        this.estimatedTotal += usage.totalTokens - accountedTotal;
      }
      return;
    }
    // No usage reported — fall back to estimate so caps still bite.
    this.estimatedTotal += Math.max(0, fallbackEstimate);
  }

  /** Best-effort current total: real where reported + estimate where not. */
  totalSoFar(): number {
    return this.prompt + this.completion + this.estimatedTotal;
  }

  promptTokens(): number {
    return this.prompt;
  }
  completionTokens(): number {
    return this.completion;
  }

  /** Writes one ledger entry. Call once at end of run (success or partial). */
  finalizeAndAppendLedger(): LedgerEntry {
    const entry: LedgerEntry = {
      ts: new Date().toISOString(),
      runId: this.runId,
      flowName: this.flowName,
      promptTokens: this.prompt,
      completionTokens: this.completion,
      totalTokens: this.totalSoFar(),
    };
    mkdirSync(dirname(this.ledgerPath), { recursive: true });
    appendFileSync(this.ledgerPath, JSON.stringify(entry) + '\n');
    return entry;
  }
}

export function ledgerPathDefault(): string {
  return join(process.cwd(), 'experiments', '.cost-ledger.jsonl');
}

/**
 * Reads the ledger and rejects if total tokens in the last 24h exceed the cap.
 * Pure read — no side effects.
 */
export function assertDailyCap(
  dailyCap: number = DEFAULT_DAILY_TOKEN_CAP,
  ledgerPath: string = ledgerPathDefault(),
  now: Date = new Date(),
): void {
  if (!existsSync(ledgerPath)) return;
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  let total = 0;
  for (const line of readFileSync(ledgerPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: LedgerEntry;
    try {
      entry = JSON.parse(trimmed) as LedgerEntry;
    } catch {
      continue; // ignore malformed lines
    }
    const t = Date.parse(entry.ts);
    if (Number.isFinite(t) && t >= cutoff) total += entry.totalTokens ?? 0;
  }
  if (total >= dailyCap) {
    throw new CostCapExceededError(
      `Daily token cap (${dailyCap}) reached: ${total} tokens used in the last 24h. Wait or raise the cap.`,
      'daily',
    );
  }
}
