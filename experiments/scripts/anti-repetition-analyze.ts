#!/usr/bin/env tsx
/**
 * Analyze anti-repetition experiment results.
 *
 * For each cell, the experiment produced 10 hypothesis cards via one of
 * three paths (one c10 call vs c5+c5 with/without anti-rep). The key
 * question: how many of those 10 cards are thematically distinct?
 *
 * The headline comparison is per (arm × brief): mean distinct-concept
 * count across the 5 reps. If splitting into c5+c5 with anti-rep
 * produces more distinct concepts than single c10, the user's
 * hypothesis is confirmed.
 *
 * Usage:
 *   pnpm tsx experiments/scripts/anti-repetition-analyze.ts \
 *     --matrix-dir <path>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

// ── Same tokenization + clustering as aggregate-matrix.ts ──────────────────

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'had',
  'not', 'but', 'they', 'them', 'their', 'there', 'than', 'then', 'these', 'those', 'into',
  'from', 'when', 'where', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'one', 'two', 'three',
  'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'any', 'all', 'each', 'every', 'some', 'such', 'about', 'after', 'before', 'between',
  'through', 'during', 'while', 'because', 'though', 'although', 'over', 'under',
  'out', 'off', 'down', 'up',
  'its', 'his', 'her', 'him', 'she', 'you', 'your', 'yours', 'our', 'ours', 'we',
  'a', 'an', 'as', 'at', 'be', 'by', 'do', 'is', 'it', 'in', 'of', 'on', 'or', 'to', 'if',
  'so', 'no', 'nor', 'too', 'very', 'just', 'also',
  'use', 'using', 'used', 'user', 'users', 'design', 'designs',
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => w.replace(/'s$|s$/, ''));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

interface HypRow {
  name: string;
  hypothesis: string;
  rationale: string;
  measurements: string;
  batch: number;
}

interface Cell {
  cellId: string;
  arm: string;
  briefId: string;
  rep: number;
  status: string;
  wallSec: number;
  hypotheses: HypRow[];
  antiRepetitionApplied: boolean;
  error?: string;
}

/** Greedy cluster a list of hypotheses by title-weighted Jaccard ≥ threshold. */
function clusterCount(hyps: HypRow[], threshold = 0.18): number {
  if (hyps.length === 0) return 0;
  const titleSets = hyps.map((h) => new Set(tokenize(h.name)));
  const fullSets = hyps.map((h) => new Set(tokenize(`${h.name}\n${h.hypothesis}`)));
  const sim = (i: number, j: number) =>
    0.6 * jaccard(titleSets[i], titleSets[j]) + 0.4 * jaccard(fullSets[i], fullSets[j]);

  const clusters: number[][] = [];
  for (let i = 0; i < hyps.length; i += 1) {
    let placed = false;
    for (const c of clusters) {
      if (sim(i, c[0]) >= threshold) {
        c.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([i]);
  }
  return clusters.length;
}

/** Mean pairwise Jaccard between titles within a list of hyps. Lower = more distinct. */
function meanWithinPairwiseSim(hyps: HypRow[]): number {
  if (hyps.length < 2) return 0;
  const sets = hyps.map((h) => new Set(tokenize(`${h.name}\n${h.hypothesis}`)));
  let pairs = 0;
  let sum = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      sum += jaccard(sets[i], sets[j]);
      pairs += 1;
    }
  }
  return pairs ? sum / pairs : 0;
}

// ── Main ───────────────────────────────────────────────────────────────────

function flagStr(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const matrixDir = flagStr(argv, 'matrix-dir');
  if (!matrixDir) {
    console.error('Usage: tsx experiments/scripts/anti-repetition-analyze.ts --matrix-dir <path>');
    process.exit(2);
  }
  const dir = resolve(matrixDir);
  if (!existsSync(dir)) {
    console.error(`Matrix dir not found: ${dir}`);
    process.exit(2);
  }
  const cells: Cell[] = readFileSync(join(dir, 'results.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Cell);

  // Per-cell metric: clusterCount over the cell's 10 hyps. Higher = more distinct.
  const enriched = cells.map((c) => ({
    ...c,
    hypCount: c.hypotheses.length,
    distinctConcepts: clusterCount(c.hypotheses, 0.18),
    meanWithinSim: meanWithinPairwiseSim(c.hypotheses),
  }));

  // Per (arm × brief) aggregate: mean distinct concepts across reps.
  type Key = `${string}__${string}`;
  const groups = new Map<Key, typeof enriched>();
  for (const c of enriched) {
    if (c.status !== 'done') continue;
    const k = `${c.arm}__${c.briefId}` as Key;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }

  const arms = [...new Set(enriched.map((c) => c.arm))].sort();
  const briefs = [...new Set(enriched.map((c) => c.briefId))].sort();

  // Per-arm overall
  const armRows = arms.map((arm) => {
    const rs = enriched.filter((c) => c.arm === arm && c.status === 'done');
    return {
      arm,
      n: rs.length,
      meanHyps: mean(rs.map((c) => c.hypCount)),
      meanDistinct: mean(rs.map((c) => c.distinctConcepts)),
      stdDistinct: std(rs.map((c) => c.distinctConcepts)),
      meanWithinSim: mean(rs.map((c) => c.meanWithinSim)),
      meanWallSec: mean(rs.map((c) => c.wallSec)),
    };
  });

  // ── Output report ──────────────────────────────────────────────────────
  const lines: string[] = [];
  const push = (s: string = '') => lines.push(s);

  push(`# Anti-repetition experiment — ${basename(dir)}`);
  push();
  push(`_Generated ${new Date().toISOString()}._`);
  push();
  push('## Setup');
  push();
  push('Each cell produces 10 hypothesis cards via one of three paths:');
  push();
  push('- **A-c10-single**: a single incubator call asking for 10 hypotheses.');
  push('- **B-c5+c5-antirep**: two calls of 5; the second call receives the first 5 via the production `existingStrategies` block ("Do NOT reproduce them").');
  push('- **C-c5+c5-noantirep**: two calls of 5; the second call has NO anti-repetition context. Null control isolating the effect of the anti-rep block vs just-splitting-the-call.');
  push();
  push(`Briefs: ${briefs.join(', ')}.`);
  push();
  push('Per-cell metric: **distinctConcepts** = number of clusters when the 10 hypothesis cards are greedy-clustered by title-weighted Jaccard at threshold 0.18. Higher = more thematically distinct cards.');
  push();
  push(`Cells run: **${enriched.length}** total · **${enriched.filter((c) => c.status === 'done').length} done** · **${enriched.filter((c) => c.status === 'failed').length} failed**.`);
  push();

  push('## Headline — distinct concepts per cell, by arm');
  push();
  push('| arm | n cells | mean hyps/cell | **mean distinct concepts / 10** | std | mean within-cell pairwise sim | mean wall (s) |');
  push('|---|---|---|---|---|---|---|');
  for (const r of armRows) {
    push(
      `| ${r.arm} | ${r.n} | ${fmt(r.meanHyps, 1)} | **${fmt(r.meanDistinct, 2)}** | ${fmt(r.stdDistinct, 2)} | ${fmt(r.meanWithinSim, 3)} | ${fmt(r.meanWallSec, 1)} |`,
    );
  }
  push();
  push('**Reading**:');
  push('- If B > A by more than ~0.5 concepts, splitting into c5+c5 with anti-rep produces meaningfully more distinct cards than a single c10 call. The user\'s hypothesis is confirmed.');
  push('- If C > A, splitting alone (without the anti-rep block) is what produces the variety — the anti-rep block is incidental.');
  push('- If B > C, the anti-rep block is doing real work over and above splitting.');
  push();

  push('## Per (arm × brief) — does the effect hold across briefs?');
  push();
  push('Mean distinct concepts per cell, by arm × brief:');
  push();
  push(`| arm \\ brief | ${briefs.join(' | ')} |`);
  push(`|---|${briefs.map(() => '---').join('|')}|`);
  for (const arm of arms) {
    const row = [`| **${arm}** `];
    for (const b of briefs) {
      const rs = enriched.filter((c) => c.arm === arm && c.briefId === b && c.status === 'done');
      row.push(rs.length ? `${fmt(mean(rs.map((c) => c.distinctConcepts)), 2)} (n=${rs.length})` : '–');
    }
    push(row.join(' | ') + ' |');
  }
  push();

  push('## Within-cell pairwise similarity by arm × brief');
  push();
  push('Lower = the 10 hypothesis cards in the cell are more lexically distinct from each other.');
  push();
  push(`| arm \\ brief | ${briefs.join(' | ')} |`);
  push(`|---|${briefs.map(() => '---').join('|')}|`);
  for (const arm of arms) {
    const row = [`| **${arm}** `];
    for (const b of briefs) {
      const rs = enriched.filter((c) => c.arm === arm && c.briefId === b && c.status === 'done');
      row.push(rs.length ? fmt(mean(rs.map((c) => c.meanWithinSim)), 3) : '–');
    }
    push(row.join(' | ') + ' |');
  }
  push();

  // Pairwise comparison of arms B and C vs A.
  push('## Pairwise effect sizes');
  push();
  const armA = enriched.filter((c) => c.arm === 'A-c10-single' && c.status === 'done');
  const armB = enriched.filter((c) => c.arm === 'B-c5+c5-antirep' && c.status === 'done');
  const armC = enriched.filter((c) => c.arm === 'C-c5+c5-noantirep' && c.status === 'done');
  const mA = mean(armA.map((c) => c.distinctConcepts));
  const mB = mean(armB.map((c) => c.distinctConcepts));
  const mC = mean(armC.map((c) => c.distinctConcepts));
  push(`- **B vs A** (anti-rep split vs single c10): +${fmt(mB - mA, 2)} distinct concepts/cell (${fmt(((mB - mA) / mA) * 100, 1)}% more)`);
  push(`- **C vs A** (no-anti-rep split vs single c10): +${fmt(mC - mA, 2)} distinct concepts/cell (${fmt(((mC - mA) / mA) * 100, 1)}% more)`);
  push(`- **B vs C** (anti-rep block isolated): +${fmt(mB - mC, 2)} distinct concepts/cell (${fmt(((mB - mC) / Math.max(mC, 0.001)) * 100, 1)}%)`);
  push();

  // ── Failures
  const fails = enriched.filter((c) => c.status === 'failed');
  if (fails.length > 0) {
    push('## Failures');
    push();
    for (const f of fails) push(`- ${f.cellId} :: ${f.error ?? '(no error)'}`);
    push();
  }

  push('## Methodology footnotes');
  push();
  push('- Spec held constant per brief: research/objectives/constraints generated once via inputs-gen and reused across all 15 cells per brief (3 arms × 5 reps). Removes inputs-gen variance as a confound.');
  push('- Clustering threshold 0.18 matches the main matrix analyzer in `aggregate-matrix.ts`.');
  push('- "Distinct concepts" is per-cell. 5 cells per arm × brief, so each arm × brief mean is across 5 reps.');
  push();

  const outPath = join(dir, 'analysis.md');
  writeFileSync(outPath, lines.join('\n'));
  console.log(`[analyze] wrote ${outPath}`);

  // Also dump per-cell enriched rows for spreadsheet inspection.
  writeFileSync(join(dir, 'cells-enriched.json'), JSON.stringify(enriched, null, 2));
  console.log(`[analyze] wrote cells-enriched.json (${enriched.length} cells)`);

  // Console summary so you don't have to open the file.
  console.log('');
  console.log('━'.repeat(60));
  console.log(`Headline distinct concepts/cell (out of 10):`);
  for (const r of armRows) {
    console.log(`  ${r.arm}: mean=${fmt(r.meanDistinct, 2)} std=${fmt(r.stdDistinct, 2)} (n=${r.n})`);
  }
  console.log(`B vs A: +${fmt(mB - mA, 2)}  ·  C vs A: +${fmt(mC - mA, 2)}  ·  B vs C: +${fmt(mB - mC, 2)}`);
  console.log('━'.repeat(60));
}

main().catch((err) => {
  console.error('[analyze] fatal:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
