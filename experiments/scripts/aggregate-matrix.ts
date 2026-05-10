#!/usr/bin/env tsx
/**
 * Matrix aggregator — extract corpus features from a completed (or in-progress)
 * matrix dir and produce both raw analysable artifacts and a human-readable
 * report.
 *
 * Designed to answer:
 *   1. Rep-noise floor — how much do 3 identical reps disagree?
 *   2. Flow signal — does flow choice shift the corpus when brief is held?
 *   3. Mix signal — does prepared R/O/C improve outputs or just shift framing?
 *   4. Count saturation — c5 vs c10, do you get 2× the surface?
 *
 * Methodology is deliberately transparent (no embeddings). All "similarity"
 * uses bag-of-content-words Jaccard. Stopwords + min length 3. Limitations
 * noted in the report.
 *
 * Usage:
 *   pnpm tsx experiments/scripts/aggregate-matrix.ts --matrix-dir <path>
 *
 * Writes into <matrix-dir>:
 *   corpus.jsonl     one row per hypothesis (with cell context)
 *   cells.json       per-cell aggregates
 *   groups.json      per-config (flow × brief × mix × count) aggregates
 *   report.md        human-readable narrative
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

// ── Tokenization (transparent, no deps) ────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'had',
  'not', 'but', 'they', 'them', 'their', 'there', 'than', 'then', 'these', 'those', 'into',
  'from', 'when', 'where', 'what', 'which', 'who', 'whom', 'whose', 'whose', 'why', 'how',
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
    .map((w) => w.replace(/'s$|s$/, '')); // very crude lemma
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ManifestCell {
  cellId: string;
  flow: string;
  briefId: string;
  mix: string;
  count: number;
  rep: number;
}

interface ResultLine {
  cellId: string;
  flow: string;
  briefId: string;
  mix: string;
  count: number;
  rep: number;
  status: 'done' | 'failed' | 'pending' | 'running';
  runId?: string;
  runRoot?: string;
  wallSec?: number;
  error?: string;
}

interface HypRow {
  cellId: string;
  flow: string;
  briefId: string;
  mix: string;
  count: number;
  rep: number;
  runId: string;
  hypIndex: number;
  title: string;
  bet: string;
  fullText: string;
  tokens: string[];
}

interface CellAggregate {
  cellId: string;
  flow: string;
  briefId: string;
  mix: string;
  count: number;
  rep: number;
  runId: string;
  wallSec?: number;
  hypCountActual: number;
  totalChars: number;
  avgHypChars: number;
  uniqueTokens: number;
  totalTokens: number;
  uniqueRatio: number; // unique tokens / total tokens — within-rep diversity
  withinRepPairwiseJaccardMean: number; // pairwise sim between this rep's hyps (lower = more diverse)
  titles: string[];
}

// ── Read matrix dir ────────────────────────────────────────────────────────

function loadResults(matrixDir: string): ResultLine[] {
  const path = join(matrixDir, 'results.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ResultLine);
}

interface HypFromFile {
  title: string;
  bet: string;
}

function extractHypsFromFile(runRoot: string): HypFromFile[] {
  const hypPath = join(runRoot, 'hypotheses.json');
  if (!existsSync(hypPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(hypPath, 'utf8'));
    const arr = (raw.hypotheses || raw.plan?.hypotheses || []) as Array<Record<string, unknown>>;
    return arr.map((h) => {
      const title = String(h.title ?? h.name ?? '');
      // Different incubator outputs use different field names for the body.
      const bet = String(
        h.bet ?? h.hypothesis ?? h.description ?? h.summary ?? h.rationale ?? '',
      );
      return { title, bet };
    });
  } catch {
    return [];
  }
}

// ── Build corpus + cell aggregates ─────────────────────────────────────────

function buildCorpus(results: ResultLine[]): { rows: HypRow[]; cells: CellAggregate[] } {
  const rows: HypRow[] = [];
  const cells: CellAggregate[] = [];

  for (const r of results) {
    if (r.status !== 'done' || !r.runRoot || !r.runId) continue;
    const hyps = extractHypsFromFile(r.runRoot);
    if (hyps.length === 0) continue;

    const hypTokenSets: Set<string>[] = [];
    let totalChars = 0;
    let allTokens: string[] = [];

    hyps.forEach((h, i) => {
      const full = `${h.title}\n${h.bet}`;
      const tokens = tokenize(full);
      hypTokenSets.push(new Set(tokens));
      totalChars += full.length;
      allTokens = allTokens.concat(tokens);
      rows.push({
        cellId: r.cellId,
        flow: r.flow,
        briefId: r.briefId,
        mix: r.mix,
        count: r.count,
        rep: r.rep,
        runId: r.runId!,
        hypIndex: i,
        title: h.title,
        bet: h.bet,
        fullText: full,
        tokens,
      });
    });

    const totalTok = allTokens.length;
    const uniqTok = new Set(allTokens).size;
    // Pairwise jaccard between this rep's own hypotheses (lower = more diverse internally).
    let pairs = 0;
    let sim = 0;
    for (let i = 0; i < hypTokenSets.length; i += 1) {
      for (let j = i + 1; j < hypTokenSets.length; j += 1) {
        sim += jaccard(hypTokenSets[i], hypTokenSets[j]);
        pairs += 1;
      }
    }
    const within = pairs > 0 ? sim / pairs : 0;

    cells.push({
      cellId: r.cellId,
      flow: r.flow,
      briefId: r.briefId,
      mix: r.mix,
      count: r.count,
      rep: r.rep,
      runId: r.runId,
      wallSec: r.wallSec,
      hypCountActual: hyps.length,
      totalChars,
      avgHypChars: hyps.length ? totalChars / hyps.length : 0,
      uniqueTokens: uniqTok,
      totalTokens: totalTok,
      uniqueRatio: totalTok ? uniqTok / totalTok : 0,
      withinRepPairwiseJaccardMean: within,
      titles: hyps.map((h) => h.title),
    });
  }
  return { rows, cells };
}

// ── Group analysis ─────────────────────────────────────────────────────────

interface GroupKey {
  flow: string;
  briefId: string;
  mix: string;
  count: number;
}

interface GroupAggregate {
  flow: string;
  briefId: string;
  mix: string;
  count: number;
  nReps: number;
  avgUniqueRatio: number;
  avgWithinRepJaccard: number;
  avgWallSec: number;
  // Cross-rep: pairwise jaccard between reps' combined token sets.
  // Higher = reps converge (low rep-noise); lower = reps diverge (high rep-noise).
  crossRepConvergence: number;
  // Theme clustering: union all hypotheses across reps, cluster by jaccard >= 0.4.
  // n_clusters / total_hyps. Closer to 1 = no convergence (every hyp unique).
  // Closer to 0.3-0.4 = strong convergence (themes repeat).
  themeClusterRatio: number;
  totalHyps: number;
}

function groupKey(g: GroupKey): string {
  return `${g.flow}__${g.briefId}__${g.mix}__c${g.count}`;
}

function buildGroups(cells: CellAggregate[], rows: HypRow[]): GroupAggregate[] {
  const groups = new Map<string, CellAggregate[]>();
  for (const c of cells) {
    const k = groupKey(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }

  const rowsByCell = new Map<string, HypRow[]>();
  for (const r of rows) {
    if (!rowsByCell.has(r.cellId)) rowsByCell.set(r.cellId, []);
    rowsByCell.get(r.cellId)!.push(r);
  }

  const out: GroupAggregate[] = [];
  for (const [, gcells] of groups) {
    const first = gcells[0];

    // Per-rep combined token sets, for cross-rep convergence.
    const repSets: Set<string>[] = gcells.map((c) => {
      const allTok: string[] = [];
      for (const r of rowsByCell.get(c.cellId) ?? []) allTok.push(...r.tokens);
      return new Set(allTok);
    });
    let pairs = 0;
    let sim = 0;
    for (let i = 0; i < repSets.length; i += 1) {
      for (let j = i + 1; j < repSets.length; j += 1) {
        sim += jaccard(repSets[i], repSets[j]);
        pairs += 1;
      }
    }
    const crossRepConvergence = pairs ? sim / pairs : 0;

    // Theme clustering across reps' hypotheses (greedy single-link, threshold 0.4).
    const allHyps: HypRow[] = [];
    for (const c of gcells) allHyps.push(...(rowsByCell.get(c.cellId) ?? []));
    const clusters: Set<string>[] = [];
    for (const h of allHyps) {
      const hs = new Set(h.tokens);
      let placed = false;
      for (const c of clusters) {
        if (jaccard(hs, c) >= 0.4) {
          for (const t of hs) c.add(t);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push(new Set(hs));
    }
    const themeClusterRatio = allHyps.length ? clusters.length / allHyps.length : 0;

    out.push({
      flow: first.flow,
      briefId: first.briefId,
      mix: first.mix,
      count: first.count,
      nReps: gcells.length,
      avgUniqueRatio: gcells.reduce((s, c) => s + c.uniqueRatio, 0) / gcells.length,
      avgWithinRepJaccard:
        gcells.reduce((s, c) => s + c.withinRepPairwiseJaccardMean, 0) / gcells.length,
      avgWallSec: gcells.reduce((s, c) => s + (c.wallSec ?? 0), 0) / gcells.length,
      crossRepConvergence,
      themeClusterRatio,
      totalHyps: allHyps.length,
    });
  }
  return out;
}

// ── Pivot helpers for report ───────────────────────────────────────────────

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function fmt(n: number, digits = 3): string {
  return n.toFixed(digits);
}

// ── Report ─────────────────────────────────────────────────────────────────

function writeReport(matrixDir: string, results: ResultLine[], cells: CellAggregate[], groups: GroupAggregate[]): void {
  const path = join(matrixDir, 'report.md');
  const lines: string[] = [];
  const push = (s: string = '') => lines.push(s);

  const totals = {
    total: results.length,
    done: results.filter((r) => r.status === 'done').length,
    failed: results.filter((r) => r.status === 'failed').length,
    pending: results.filter((r) => r.status === 'pending').length,
    running: results.filter((r) => r.status === 'running').length,
  };

  const hypTotal = cells.reduce((s, c) => s + c.hypCountActual, 0);

  push(`# Matrix analysis — ${basename(matrixDir)}`);
  push();
  push(`_Generated ${new Date().toISOString()}._`);
  push();
  push('## Headline');
  push();
  push(`- **Cells**: ${totals.total} total · ${totals.done} done · ${totals.failed} failed · ${totals.pending + totals.running} unfinished`);
  push(`- **Hypotheses extracted**: ${hypTotal} across ${cells.length} completed cells`);
  push(`- **Flows tested**: ${[...new Set(cells.map((c) => c.flow))].sort().join(', ')}`);
  push(`- **Briefs tested**: ${[...new Set(cells.map((c) => c.briefId))].sort().join(', ')}`);
  push(`- **Mixes tested**: ${[...new Set(cells.map((c) => c.mix))].sort().join(', ')}`);
  push(`- **Counts tested**: ${[...new Set(cells.map((c) => c.count))].sort((a, b) => a - b).join(', ')}`);
  push();
  push('## Methodology — what the numbers mean');
  push();
  push('All similarity uses **bag-of-content-words Jaccard**. Tokens are lowercased,');
  push('stopword-filtered, length ≥ 3. No embeddings, no model in the loop — just');
  push('transparent set overlap. Limitations: synonyms (`memory vault` vs `archive`)');
  push('count as distinct, and reps that paraphrase the same idea register as low');
  push('similarity. Treat differences as suggestive, not statistical claims.');
  push();
  push('Key columns:');
  push('- **withinRepJaccard** — mean pairwise similarity between hypotheses *in the same rep*. Lower = the incubator produced more diverse picks within one run.');
  push('- **crossRepConvergence** — mean pairwise similarity between *the three reps* of the same config. Higher = reps converge (low rep-noise). Lower = reps diverge (high rep-noise — single-run reads mislead).');
  push('- **themeClusterRatio** — across all hypotheses of the three reps, the fraction that survive greedy clustering at Jaccard ≥ 0.4. Closer to 1 = every hypothesis is unique (no theme overlap). Around 0.5–0.7 = clear themes repeat across reps.');
  push();

  // ── Section 1: Rep-noise floor (per group) ─────────────────────────────
  push('## 1. Rep-noise floor');
  push();
  push('How much do three reps of the *exact same config* disagree? This is the');
  push('noise floor that any "X is better than Y" claim has to clear.');
  push();
  push('| flow | brief | mix | count | reps | crossRepConv | themeClusterRatio | withinRepJac |');
  push('|---|---|---|---|---|---|---|---|');
  const sortedGroups = [...groups].sort((a, b) =>
    `${a.flow}|${a.briefId}|${a.mix}|${a.count}`.localeCompare(`${b.flow}|${b.briefId}|${b.mix}|${b.count}`),
  );
  for (const g of sortedGroups) {
    if (g.nReps < 2) continue;
    push(`| ${g.flow} | ${g.briefId} | ${g.mix} | ${g.count} | ${g.nReps} | ${fmt(g.crossRepConvergence)} | ${fmt(g.themeClusterRatio)} | ${fmt(g.avgWithinRepJaccard)} |`);
  }
  push();

  // Group-level summary stats.
  const repConvAll = avg(groups.filter((g) => g.nReps >= 2).map((g) => g.crossRepConvergence));
  const themeRatioAll = avg(groups.filter((g) => g.nReps >= 2).map((g) => g.themeClusterRatio));
  push(`**Headline noise floor**: avg crossRepConvergence = **${fmt(repConvAll)}**, avg themeClusterRatio = **${fmt(themeRatioAll)}**.`);
  push();

  // ── Section 2: Flow comparison ─────────────────────────────────────────
  push('## 2. Flow shape — does picking ideation vs canonical actually shift the corpus?');
  push();
  push('Holding brief × mix × count constant, compare per-flow averages.');
  push();
  const flowGroupedKeys = new Map<string, GroupAggregate[]>();
  for (const g of groups) {
    const k = `${g.briefId}__${g.mix}__c${g.count}`;
    if (!flowGroupedKeys.has(k)) flowGroupedKeys.set(k, []);
    flowGroupedKeys.get(k)!.push(g);
  }
  push('Per-flow averages across all (brief × mix × count) cells:');
  push();
  push('| flow | n_groups | avg crossRepConv | avg themeClusterRatio | avg withinRepJac | avg uniqueRatio | avg wallSec |');
  push('|---|---|---|---|---|---|---|');
  const byFlow = new Map<string, GroupAggregate[]>();
  for (const g of groups) {
    if (!byFlow.has(g.flow)) byFlow.set(g.flow, []);
    byFlow.get(g.flow)!.push(g);
  }
  for (const [flow, gs] of [...byFlow.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    push(
      `| ${flow} | ${gs.length} | ${fmt(avg(gs.map((g) => g.crossRepConvergence)))} | ${fmt(avg(gs.map((g) => g.themeClusterRatio)))} | ${fmt(avg(gs.map((g) => g.avgWithinRepJaccard)))} | ${fmt(avg(gs.map((g) => g.avgUniqueRatio)))} | ${fmt(avg(gs.map((g) => g.avgWallSec)), 1)} |`,
    );
  }
  push();

  // ── Section 3: Mix comparison ──────────────────────────────────────────
  push('## 3. Input mix — does prepared R/O/C improve outputs or just shift framing?');
  push();
  push('Per-mix averages across all (flow × brief × count) cells:');
  push();
  push('| mix | n_groups | avg crossRepConv | avg themeClusterRatio | avg withinRepJac | avg uniqueRatio | avg wallSec |');
  push('|---|---|---|---|---|---|---|');
  const byMix = new Map<string, GroupAggregate[]>();
  for (const g of groups) {
    if (!byMix.has(g.mix)) byMix.set(g.mix, []);
    byMix.get(g.mix)!.push(g);
  }
  for (const [mix, gs] of [...byMix.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    push(
      `| ${mix} | ${gs.length} | ${fmt(avg(gs.map((g) => g.crossRepConvergence)))} | ${fmt(avg(gs.map((g) => g.themeClusterRatio)))} | ${fmt(avg(gs.map((g) => g.avgWithinRepJaccard)))} | ${fmt(avg(gs.map((g) => g.avgUniqueRatio)))} | ${fmt(avg(gs.map((g) => g.avgWallSec)), 1)} |`,
    );
  }
  push();

  // ── Section 4: Count saturation ────────────────────────────────────────
  push('## 4. Count saturation — does asking for more hypotheses give you more, or do you just hit the same themes louder?');
  push();
  push('Per-count averages across all (flow × brief × mix) cells:');
  push();
  push('| count | n_groups | avg themeClusterRatio | avg withinRepJac | avg uniqueRatio | avg wallSec |');
  push('|---|---|---|---|---|---|');
  const byCount = new Map<number, GroupAggregate[]>();
  for (const g of groups) {
    if (!byCount.has(g.count)) byCount.set(g.count, []);
    byCount.get(g.count)!.push(g);
  }
  for (const [count, gs] of [...byCount.entries()].sort(([a], [b]) => a - b)) {
    push(
      `| ${count} | ${gs.length} | ${fmt(avg(gs.map((g) => g.themeClusterRatio)))} | ${fmt(avg(gs.map((g) => g.avgWithinRepJaccard)))} | ${fmt(avg(gs.map((g) => g.avgUniqueRatio)))} | ${fmt(avg(gs.map((g) => g.avgWallSec)), 1)} |`,
    );
  }
  push();
  push('Interpretation: if themeClusterRatio at c10 ≈ themeClusterRatio at c5, count is mostly redundant.');
  push();

  // ── Section 5: Brief × flow interaction ────────────────────────────────
  push('## 5. Brief × flow interaction — is one flow consistently better, or does it depend on the brief?');
  push();
  push('Avg themeClusterRatio (lower = themes converge more, suggesting the corpus is repetitive):');
  push();
  const briefs = [...new Set(groups.map((g) => g.briefId))].sort();
  const flows = [...new Set(groups.map((g) => g.flow))].sort();
  push(`| brief \\ flow | ${flows.join(' | ')} |`);
  push(`|---|${flows.map(() => '---').join('|')}|`);
  for (const b of briefs) {
    const row = [`| ${b} `];
    for (const f of flows) {
      const gs = groups.filter((g) => g.briefId === b && g.flow === f);
      row.push(gs.length ? fmt(avg(gs.map((g) => g.themeClusterRatio))) : '–');
    }
    push(row.join(' | ') + ' |');
  }
  push();

  // ── Section 6: Failures ────────────────────────────────────────────────
  const fails = results.filter((r) => r.status === 'failed');
  if (fails.length > 0) {
    push('## 6. Failures');
    push();
    for (const f of fails) {
      push(`- **${f.cellId}** :: ${f.error ?? '(no error)'}`);
    }
    push();
  }

  push('## How to read this for a writeup');
  push();
  push('- If **section 1** shows crossRepConvergence around 0.1–0.2, the rep-noise floor is *high* — three runs of the same config produce substantially different corpora. Any cross-cell claim must show a delta larger than that noise.');
  push('- If **section 2** (flows) shows all flows clustering within ±0.05 of each other on the same metrics, the flow surface is *not adding signal*. If one flow systematically dominates (e.g. ideation has lower withinRepJac → more internally diverse picks), that\'s the win to lead with.');
  push('- If **section 3** (mixes) shows user-supplied R/O/C *not* improving uniqueRatio or theme spread, the prepared-context surface is mostly cosmetic. If it shifts themeClusterRatio noticeably, it changes the *kind* of output, not the *quantity* — still informative.');
  push('- If **section 4** (counts) shows themeClusterRatio rising with count (more clusters per hypothesis), c10 is buying genuine breadth. If it falls or flatlines, you\'re paying tokens for repetition.');
  push();

  writeFileSync(path, lines.join('\n'));
  console.log(`[aggregate] wrote ${path}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

function flagStr(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return argv[i + 1];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const matrixDir = flagStr(argv, 'matrix-dir');
  if (!matrixDir) {
    console.error('Usage: tsx experiments/scripts/aggregate-matrix.ts --matrix-dir <path>');
    process.exit(2);
  }
  const dir = resolve(matrixDir);
  if (!existsSync(dir)) {
    console.error(`Matrix dir not found: ${dir}`);
    process.exit(2);
  }
  const results = loadResults(dir);
  if (results.length === 0) {
    console.error(`No results.jsonl rows in ${dir}`);
    process.exit(2);
  }

  const { rows, cells } = buildCorpus(results);
  const groups = buildGroups(cells, rows);

  // Write corpus.jsonl
  const corpusPath = join(dir, 'corpus.jsonl');
  writeFileSync(corpusPath, '');
  for (const r of rows) {
    appendFileSync(corpusPath, JSON.stringify(r) + '\n');
  }
  console.log(`[aggregate] wrote ${corpusPath} (${rows.length} rows)`);

  writeFileSync(join(dir, 'cells.json'), JSON.stringify(cells, null, 2));
  console.log(`[aggregate] wrote cells.json (${cells.length} cells)`);

  writeFileSync(join(dir, 'groups.json'), JSON.stringify(groups, null, 2));
  console.log(`[aggregate] wrote groups.json (${groups.length} groups)`);

  writeReport(dir, results, cells, groups);
}

main().catch((err) => {
  console.error('[aggregate] fatal:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
