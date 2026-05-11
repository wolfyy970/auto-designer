/**
 * Unit tests for the experiments-tool stage scaffolding shipped cycle 14-20.
 *
 * Covers:
 * - `extractResultFile` (cycle 20 consolidation; drift-debug log path)
 * - `StageTimeoutError` / `StreamIdleError` (typed errors from cycle 15/20)
 * - `isStageRetryable` (cycle 20 retry-gating policy)
 * - `interruptibleSleep` (cycle 20 signal-aware backoff)
 * - `withStageTimeout` (cycle 15 outer safety net)
 * - `parseHonestyVerdict` (cycle 20 honesty-check JSON parser)
 *
 * Heavy callers (`runStageWithTranscript`, `runHonestyCheck`,
 * `runDesignBuild`) are integration-tested through live flow runs in the
 * experiments tool itself; covering them here would require mocking the
 * entire Pi runtime stack.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  StageTimeoutError,
  extractResultFile,
  interruptibleSleep,
  isStageRetryable,
  parseHonestyVerdict,
  stageRetryBackoffMs,
  withStageTimeout,
} from '../flow.ts';
import { StreamIdleError } from '../../../server/services/pi-agent-runtime.ts';
import { CostCapExceededError } from '../cost.ts';

// ── extractResultFile ────────────────────────────────────────────────────

describe('extractResultFile', () => {
  it('returns expected file content when present', () => {
    const files = { 'result.txt': '  hello world  ', 'other.md': 'noise' };
    expect(extractResultFile(files, 'result.txt', 'test-stage')).toBe('hello world');
  });

  it('falls back to first non-empty file when expected is missing', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const files = { 'wrong-name.md': '  fallback content  ' };
    expect(extractResultFile(files, 'result.txt', 'test-stage')).toBe('fallback content');
    // Drift-debug log fires so prompt fidelity issues stay visible
    expect(debug).toHaveBeenCalledWith(expect.stringMatching(/wrong-name\.md.*result\.txt/u));
    debug.mockRestore();
  });

  it('returns empty string when no file has content', () => {
    expect(extractResultFile({ 'a.md': '', 'b.md': '   ' }, 'result.txt', 'test')).toBe('');
    expect(extractResultFile({}, 'result.txt', 'test')).toBe('');
  });

  it('prefers expected over fallback even if both present', () => {
    const files = { 'result.txt': 'right', 'other.md': 'wrong' };
    expect(extractResultFile(files, 'result.txt', 'test')).toBe('right');
  });

  it('skips empty expected and uses fallback', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const files = { 'result.txt': '   ', 'fallback.md': 'usable' };
    expect(extractResultFile(files, 'result.txt', 'test')).toBe('usable');
    debug.mockRestore();
  });
});

// ── Error classes ────────────────────────────────────────────────────────

describe('StageTimeoutError', () => {
  it('instanceof works and fields populate', () => {
    const e = new StageTimeoutError('inputs-gen[x]', 90_000);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(StageTimeoutError);
    expect(e.label).toBe('inputs-gen[x]');
    expect(e.timeoutMs).toBe(90_000);
    expect(e.name).toBe('StageTimeoutError');
    expect(e.message).toContain('inputs-gen[x]');
    expect(e.message).toContain('90s');
  });
});

describe('StreamIdleError', () => {
  it('instanceof works and fields populate', () => {
    const e = new StreamIdleError(45_000, 'corr-1');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(StreamIdleError);
    expect(e.idleMs).toBe(45_000);
    expect(e.correlationId).toBe('corr-1');
    expect(e.name).toBe('StreamIdleError');
    expect(e.message).toContain('45s');
    expect(e.message).toContain('corr-1');
  });

  it('correlationId is optional', () => {
    const e = new StreamIdleError(60_000);
    expect(e.correlationId).toBeUndefined();
    expect(e.message).toContain('60s');
    expect(e.message).not.toContain('correlationId=');
  });
});

// ── isStageRetryable ─────────────────────────────────────────────────────

describe('isStageRetryable', () => {
  it('does NOT retry StageTimeoutError (budget hit; retry hits same wall)', () => {
    expect(isStageRetryable(new StageTimeoutError('x', 1000))).toBe(false);
  });

  it('does NOT retry CostCapExceededError (budget gate)', () => {
    expect(isStageRetryable(new CostCapExceededError('cap exceeded', 'per-run'))).toBe(false);
  });

  it('DOES retry StreamIdleError (flaky fetch recovery)', () => {
    expect(isStageRetryable(new StreamIdleError(45_000))).toBe(true);
  });

  it('DOES retry generic Error (transient until proven otherwise)', () => {
    expect(isStageRetryable(new Error('Task agent session returned no result.'))).toBe(true);
  });

  it('does NOT retry non-Error rejection values', () => {
    expect(isStageRetryable('a string')).toBe(false);
    expect(isStageRetryable(undefined)).toBe(false);
    expect(isStageRetryable({ message: 'plain object' })).toBe(false);
  });
});

// ── stageRetryBackoffMs ──────────────────────────────────────────────────

describe('stageRetryBackoffMs', () => {
  it('returns ~1500ms (±25%) for the first failure', () => {
    for (let i = 0; i < 20; i++) {
      const v = stageRetryBackoffMs(1);
      expect(v).toBeGreaterThanOrEqual(1125);
      expect(v).toBeLessThanOrEqual(1875);
    }
  });

  it('returns ~8000ms (±25%) for the second failure', () => {
    for (let i = 0; i < 20; i++) {
      const v = stageRetryBackoffMs(2);
      expect(v).toBeGreaterThanOrEqual(6000);
      expect(v).toBeLessThanOrEqual(10000);
    }
  });

  it('returns ~30000ms (±25%) for the third failure', () => {
    for (let i = 0; i < 20; i++) {
      const v = stageRetryBackoffMs(3);
      expect(v).toBeGreaterThanOrEqual(22500);
      expect(v).toBeLessThanOrEqual(37500);
    }
  });

  it('clamps beyond schedule length to the last entry', () => {
    const v = stageRetryBackoffMs(99);
    expect(v).toBeGreaterThanOrEqual(22500);
    expect(v).toBeLessThanOrEqual(37500);
  });
});

// ── interruptibleSleep ───────────────────────────────────────────────────

describe('interruptibleSleep', () => {
  it('resolves after the requested duration', async () => {
    const t0 = Date.now();
    await interruptibleSleep(50, undefined);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(40); // small clock slop
  });

  it('resolves immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const t0 = Date.now();
    await interruptibleSleep(1000, controller.signal);
    expect(Date.now() - t0).toBeLessThan(50);
  });

  it('resolves early when signal aborts mid-sleep', async () => {
    const controller = new AbortController();
    const sleep = interruptibleSleep(1000, controller.signal);
    setTimeout(() => controller.abort(), 20);
    const t0 = Date.now();
    await sleep;
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(15);
    expect(elapsed).toBeLessThan(200);
  });

  it('cleans up the abort listener if timer fires first', async () => {
    const controller = new AbortController();
    await interruptibleSleep(20, controller.signal);
    // Aborting after the sleep completes shouldn't throw or have residual effects.
    expect(() => controller.abort()).not.toThrow();
  });
});

// ── withStageTimeout ─────────────────────────────────────────────────────

describe('withStageTimeout', () => {
  it('returns the fn result on success', async () => {
    const out = await withStageTimeout('test', 1000, undefined, async () => 42);
    expect(out).toBe(42);
  });

  it('throws StageTimeoutError when the budget is exceeded', async () => {
    await expect(
      withStageTimeout('slow-stage', 30, undefined, async (signal) => {
        // Loop until aborted to simulate a stage that doesn't honor the signal promptly.
        await new Promise<void>((resolve) => {
          if (signal.aborted) return resolve();
          signal.addEventListener('abort', () => resolve(), { once: true });
        });
        throw new Error('aborted inside fn');
      }),
    ).rejects.toBeInstanceOf(StageTimeoutError);
  });

  it('the StageTimeoutError carries the label and timeoutMs', async () => {
    try {
      await withStageTimeout('label-x', 25, undefined, (signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        }),
      );
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(StageTimeoutError);
      const e = err as StageTimeoutError;
      expect(e.label).toBe('label-x');
      expect(e.timeoutMs).toBe(25);
    }
  });

  it('forwards parent-signal abort to fn', async () => {
    const parent = new AbortController();
    setTimeout(() => parent.abort(), 20);
    let sawAbort = false;
    await expect(
      withStageTimeout('test', 5000, parent.signal, (signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => {
            sawAbort = true;
            reject(new Error('aborted'));
          }, { once: true });
        }),
      ),
    ).rejects.toThrow('aborted');
    expect(sawAbort).toBe(true);
  });

  it('does NOT rewrite non-timeout errors thrown by fn', async () => {
    const err = await withStageTimeout('test', 1000, undefined, async () => {
      throw new Error('something else');
    }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(StageTimeoutError);
    expect(err.message).toBe('something else');
  });

  it('respects parent signal that is already aborted', async () => {
    const parent = new AbortController();
    parent.abort();
    let signalSeenAborted = false;
    await withStageTimeout('test', 1000, parent.signal, async (signal) => {
      signalSeenAborted = signal.aborted;
      return 'done';
    });
    expect(signalSeenAborted).toBe(true);
  });
});

// ── parseHonestyVerdict ──────────────────────────────────────────────────

describe('parseHonestyVerdict', () => {
  it('parses a well-formed verdict', () => {
    const json = JSON.stringify({
      verdict: 'hollow',
      findings: [
        {
          file: 'app.js',
          line: 42,
          comment: '// simulate biometric',
          isBetCritical: true,
          severity: 'hollow',
          explanation: 'fake stub',
        },
      ],
    });
    const v = parseHonestyVerdict(json);
    expect(v.verdict).toBe('hollow');
    expect(v.findings).toHaveLength(1);
    expect(v.findings[0]).toMatchObject({
      file: 'app.js',
      line: 42,
      isBetCritical: true,
      severity: 'hollow',
    });
  });

  it('normalizes verdict casing + unknown verdicts to "unknown"', () => {
    expect(parseHonestyVerdict('{"verdict":"CLEAN","findings":[]}').verdict).toBe('clean');
    expect(parseHonestyVerdict('{"verdict":"weird","findings":[]}').verdict).toBe('unknown');
    expect(parseHonestyVerdict('{"verdict":"","findings":[]}').verdict).toBe('unknown');
  });

  it('defaults severity to "minor" when finding has an unknown severity', () => {
    const v = parseHonestyVerdict(
      JSON.stringify({ verdict: 'minor', findings: [{ file: 'x', severity: 'critical' }] }),
    );
    expect(v.findings[0].severity).toBe('minor');
  });

  it('coerces missing finding fields to safe defaults', () => {
    const v = parseHonestyVerdict(
      JSON.stringify({ verdict: 'clean', findings: [{}] }),
    );
    expect(v.findings[0]).toMatchObject({
      file: '',
      comment: '',
      isBetCritical: false,
      explanation: '',
    });
    expect(v.findings[0].line).toBeUndefined();
  });

  it('returns unknown verdict + empty findings on malformed JSON', () => {
    expect(parseHonestyVerdict('not json at all')).toEqual({ verdict: 'unknown', findings: [] });
    expect(parseHonestyVerdict('')).toEqual({ verdict: 'unknown', findings: [] });
  });

  it('handles non-object JSON gracefully', () => {
    expect(parseHonestyVerdict('null')).toEqual({ verdict: 'unknown', findings: [] });
    expect(parseHonestyVerdict('"a string"')).toEqual({ verdict: 'unknown', findings: [] });
    expect(parseHonestyVerdict('[1,2,3]')).toEqual({ verdict: 'unknown', findings: [] });
  });

  it('handles missing findings array', () => {
    const v = parseHonestyVerdict('{"verdict":"clean"}');
    expect(v.verdict).toBe('clean');
    expect(v.findings).toEqual([]);
  });

  it('tolerates messy JSON the model sometimes emits (wrapped in prose)', () => {
    const messy = 'Here is the verdict:\n```json\n{"verdict": "minor", "findings": []}\n```';
    const v = parseHonestyVerdict(messy);
    expect(v.verdict).toBe('minor');
  });
});
