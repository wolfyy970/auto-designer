/**
 * Per-run preview gallery — one HTML page that lists every hypothesis with a
 * direct "Open ↗" link to each artifact's `index.html`. Lets the human reviewer
 * load and click through every built design from a single starting point
 * instead of guessing UUID directory paths.
 *
 * The preview.html is intentionally minimal: neutral typography, no fancy
 * design, doesn't compete with the artifacts being previewed. Opens each
 * artifact in a new tab so the reviewer can compare side-by-side.
 */
import { writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { IncubationPlan } from '../../src/types/incubator.ts';
import type { RunDir } from './runDir.ts';
import type { PerHypothesisSummary } from './summary.ts';

export interface WritePreviewInput {
  runDir: RunDir;
  flowName: string;
  briefId: string;
  plan?: IncubationPlan;
  hypotheses: PerHypothesisSummary[];
  dryRun: boolean;
}

const PREVIEW_FILENAME = 'preview.html';

export function previewPathFor(runDir: RunDir): string {
  return join(runDir.root, PREVIEW_FILENAME);
}

export function writePreview(input: WritePreviewInput): string | null {
  // Inputs-gen runs and any run with no hypotheses don't need a preview gallery —
  // there are no artifacts to preview.
  if (!input.plan || input.plan.hypotheses.length === 0) return null;

  const path = previewPathFor(input.runDir);
  const cards = input.plan.hypotheses
    .map((h) => renderCard(h, input.hypotheses, input.runDir, input.dryRun))
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preview — ${escapeHtml(input.runDir.id)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 920px;
      margin: 2.5rem auto;
      padding: 0 1.5rem 4rem;
      color: #1a1a1a;
      background: #fafaf8;
      line-height: 1.5;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .meta {
      color: #6b6b6b;
      font-size: 0.9rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e8e6e0;
    }
    .meta code {
      background: #efece6;
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-size: 0.85rem;
    }
    .meta a {
      color: #2c2c2c;
      text-decoration: underline;
      text-decoration-color: #c9c4b8;
      text-underline-offset: 3px;
    }
    .hyp-card {
      background: white;
      border: 1px solid #e8e6e0;
      border-radius: 10px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.25rem;
    }
    .hyp-card h2 {
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
      letter-spacing: -0.01em;
    }
    .hyp-card .scope {
      color: #6b6b6b;
      font-size: 0.8rem;
      margin-bottom: 1rem;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
    }
    .hyp-card .actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .hyp-card .open {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.5rem 0.95rem;
      background: #1a1a1a;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background 0.15s;
    }
    .hyp-card .open:hover { background: #000; }
    .hyp-card .meta-line {
      color: #999;
      font-size: 0.78rem;
      margin-left: auto;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
    }
    .hyp-card .error {
      color: #b85450;
      font-size: 0.85rem;
      margin-top: 0.6rem;
    }
    .hyp-card .dryrun-note {
      color: #999;
      font-size: 0.85rem;
      font-style: italic;
    }
    .footer-links {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e8e6e0;
      font-size: 0.85rem;
      color: #6b6b6b;
    }
    .footer-links a {
      color: #2c2c2c;
      margin-right: 1rem;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.flowName)} run</h1>
  <p class="meta">
    <code>${escapeHtml(input.runDir.id)}</code> ·
    Brief: <code>${escapeHtml(input.briefId)}</code> ·
    ${input.plan.hypotheses.length} hypotheses${input.dryRun ? ' · <strong>dry-run</strong> (no artifacts built)' : ''}
  </p>

  ${cards}

  <div class="footer-links">
    <a href="summary.md">summary.md</a>
    <a href="critique.md">critique.md</a>
    <a href="feedback.md">feedback.md</a>
    <a href="hypotheses.json">hypotheses.json</a>
    <a href="spec.md">spec.md</a>
  </div>
</body>
</html>
`;

  writeFileSync(path, html);
  return path;
}

function renderCard(
  h: { id: string; name: string; dimensionValues: Record<string, string> },
  perHyp: PerHypothesisSummary[],
  runDir: RunDir,
  dryRun: boolean,
): string {
  const summary = perHyp.find((p) => p.hypothesisId === h.id);
  const artifactsDir = join(runDir.artifacts, h.id);
  const indexPath = join(artifactsDir, 'index.html');
  const hasIndex = existsSync(indexPath);
  const fileCount = existsSync(artifactsDir)
    ? readdirSync(artifactsDir, { recursive: true }).filter((f) => typeof f === 'string').length
    : 0;

  const scopeBits = Object.entries(h.dimensionValues ?? {})
    .map(([k, v]) => `${k} = ${v}`)
    .join(' · ');

  const actions = dryRun
    ? `<span class="dryrun-note">No artifact built (dry-run)</span>`
    : hasIndex
      ? `<a class="open" href="artifacts/${h.id}/index.html" target="_blank" rel="noopener">Open ↗</a>`
      : `<span class="dryrun-note">index.html not found in artifact dir</span>`;

  const fileCountLine = fileCount > 0
    ? `<span class="meta-line">${fileCount} file${fileCount === 1 ? '' : 's'}</span>`
    : '';

  const errorLine = summary?.error
    ? `<p class="error">stage error: ${escapeHtml(summary.error)}</p>`
    : '';

  return `<div class="hyp-card">
    <h2>${escapeHtml(h.name)}</h2>
    <p class="scope">${escapeHtml(scopeBits || '(no positions)')}</p>
    <div class="actions">
      ${actions}
      ${fileCountLine}
    </div>
    ${errorLine}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
