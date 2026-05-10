/**
 * Run directory layout — paths, IDs, basic I/O helpers.
 *
 * Every experiment writes to `experiments/runs/<run-id>/` with a fixed
 * sub-structure that both the agent and the human can navigate cold.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface RunDir {
  readonly id: string;
  readonly flowName: string;
  readonly briefId: string;
  readonly dryRun: boolean;
  readonly root: string;
  readonly summary: string;
  readonly config: string;
  readonly spec: string;
  readonly hypotheses: string;
  readonly transcripts: string;
  readonly artifacts: string;
  readonly evals: string;
  readonly critique: string;
  readonly feedback: string;
}

export interface CreateRunDirInput {
  flowName: string;
  briefId: string;
  dryRun: boolean;
  /** Override the experiments root for tests; defaults to `<repoRoot>/experiments`. */
  experimentsRoot?: string;
}

/** Repo-root-relative experiments dir. The CLI is run via `pnpm exp …` so cwd is the repo root. */
function defaultExperimentsRoot(): string {
  return join(process.cwd(), 'experiments');
}

function timestampUtc(d: Date = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function shortHash(): string {
  return randomBytes(3).toString('hex').slice(0, 4);
}

function safeFlowSlug(flowName: string): string {
  return flowName.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 32);
}

export function createRunDir(input: CreateRunDirInput): RunDir {
  const expRoot = input.experimentsRoot ?? defaultExperimentsRoot();
  const id = `${timestampUtc()}-${safeFlowSlug(input.flowName)}-${shortHash()}`;
  const root = join(expRoot, 'runs', id);

  mkdirSync(join(root, 'transcripts'), { recursive: true });
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  mkdirSync(join(root, 'evals'), { recursive: true });

  const dir: RunDir = {
    id,
    flowName: input.flowName,
    briefId: input.briefId,
    dryRun: input.dryRun,
    root,
    summary: join(root, 'summary.md'),
    config: join(root, 'config.json'),
    spec: join(root, 'spec.md'),
    hypotheses: join(root, 'hypotheses.json'),
    transcripts: join(root, 'transcripts'),
    artifacts: join(root, 'artifacts'),
    evals: join(root, 'evals'),
    critique: join(root, 'critique.md'),
    feedback: join(root, 'feedback.md'),
  };

  // Seed the per-run human/agent files so paths always exist even if the run
  // bails out early. Empty placeholders are a feature: an agent reading a run
  // never has to handle "file may not exist."
  writeFileSync(dir.critique, critiquePlaceholder(dir));
  writeFileSync(dir.feedback, feedbackPlaceholder(dir));
  return dir;
}

function critiquePlaceholder(dir: RunDir): string {
  return `# Critique — ${dir.id}

_Placeholder. Read \`summary.md\`, \`hypotheses.json\`, transcripts, artifacts, and \`evals/*.json\`, then write the critique here._

## Recap

(One-paragraph recap of what the flow produced.)

## Per-rubric notes

- **hypothesis_adherence**:
- **scope handling**:
- **measurements quality**:
- **design quality / craft**:
- **implementation**:

## Open observations

(Anything not covered by the rubric.)

## Suggested next experiments

(What to try next given what this run revealed.)
`;
}

function feedbackPlaceholder(dir: RunDir): string {
  return `# Feedback on critique — ${dir.id}

_The agent captures human feedback (given inline in chat) into this file so it persists across sessions. The human does not edit this file directly. During periodic consolidation passes the agent reads accumulated feedback files and proposes updates to \`experiments/critique-guide.md\`; the human approves inline._

## Where the critique was off

(Lines or rubric calls the agent got wrong, with corrections.)

## What the critique missed

(Things the agent didn't flag that the human caught.)

## What to keep doing

(Calibration patterns the agent got right that should persist.)
`;
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

export function readJson<T = unknown>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function readText(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}
