# User Guide

## Setup

```bash
pnpm install
cp .env.example .env.local
# Optional but recommended for agentic mode: headless Chromium for browser-grounded eval
pnpm exec playwright install chromium
```

Add your API key to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...
```

This key stays server-side only (the Hono API reads it; Vite proxies `/api` in dev).

For LM Studio vision models, optionally set:

```
VITE_LMSTUDIO_VISION_MODELS=llava,minicpm-v,qwen2-vl
```

```bash
pnpm dev:all      # recommended: API then Vite (avoids early proxy errors)
# Or: pnpm dev:server  in one terminal, pnpm dev  in another
```

Both processes are needed for local development.

**Only Vite running:** The UI blocks on `**GET /api/config`** until the API (default **`PORT`** **4731**) answers—use `**pnpm dev:all`** or run `**pnpm dev:server`** alongside `**pnpm dev`**. The dev design-token page `**/dev/design-tokens**` is the only route that skips that check.

**Saved canvases and browser storage:** The app keeps your active workspace in browser storage for the origin you use (default dev: `**http://localhost:4732**`; not `127.0.0.1` — that is a separate origin to the browser). Canvas Manager stores the lightweight list in **localStorage** and full canvas snapshots/artifacts in **IndexedDB**. The URL includes the **port**: opening the app on a different port is a different site, so lists and the current canvas can look empty. Vite uses **`strictPort`** for the dev URL; if Vite won’t start, run `pnpm dev:kill` and retry. Override with **`VITE_PORT`** in `.env.local` (see `.env.example`).

## Dev logs

In **development** only, the API keeps an in-memory `**/api/logs`** ring (LLM rows + run-trace lines + task rows) and mirrors the same payload to `logs/agent-snapshot.json` for local inspection; optional NDJSON observability logs are separate. That route returns **404** in **production**. The **variant run timeline** still shows live tool activity for the current preview. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Design tokens reference (Settings)

**Development only:** **Settings** (gear) → **General** → **Open design tokens kitchen sink** opens a scrollable modal of live `@theme` colors, typography, and composition classes (`ds-*`, `.input-focus`). The same content is available at `**/dev/design-tokens`**. Semantics and rules: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Prompts and skills (editing the repo)

There is no in-app prompt editor. Change prompt and skill files in the repo, restart the API if needed, run tests, and snapshot the tuned content with `pnpm snap`. Runtime flow, prompt roles, and skill locations live in [RUNTIME_FLOW.md](RUNTIME_FLOW.md); server mechanics live in [ARCHITECTURE.md](ARCHITECTURE.md).

### Version history

If you edit a **skill** (`packages/auto-designer-pi/skills/<key>/SKILL.md`), a **prompt template** (`packages/auto-designer-pi/prompts/<name>.md`, including `_designer-system.md`), or **`config/rubric-weights.json`** yourself (this app's prompts live in the repo — there is no in-app editor), you can keep a history without snapshotting *before* every edit.

**What gets saved**

- **Skills:** Timestamped copies under **`packages/auto-designer-pi/skills/<key>/_versions/`** next to each `SKILL.md`.
- **Prompt templates:** **`packages/auto-designer-pi/prompts/_versions/<name>/`** — single shared `_versions/` dir under prompts, with one subdir per template file. Pi's loader does NOT recurse, so `_versions/` is invisible to slash-command discovery.
- **Rubric weights:** Still under **`.prompt-versions/snapshots/`** (so `src/lib/` stays clean).
- **Manifest:** **`.prompt-versions/manifest.jsonl`** records every snapshot.

**What to do**

1. **Edit** — Change files in your editor and save as usual. Iterate as much as you want.
2. **Checkpoint** — From the repo root, run **`pnpm snap`** (no arguments). It compares each versioned file to its **latest snapshot** and saves **only** what changed. Run it whenever you want a named point in time, or rely on **git commit** (the pre-commit hook runs the same logic and stages new snapshots).
3. **Commit** — Commit your edits **and** new files under **`_versions/`**, **`.prompt-versions/`**, and the manifest so the team shares history.

That is the normal loop: edit first, snap after.

**Power user: one explicit file**

```bash
pnpm snap packages/auto-designer-pi/skills/<key>/SKILL.md
```

That still snapshots the **current on-disk** contents of that path (legacy “save this version now”).

**Later: list, diff, or restore**

| Goal | Command |
|------|---------|
| List saved versions (newest first) | `pnpm snap --list <path>` |
| Diff two saved versions | `pnpm snap --diff <path> <safeTsA> <safeTsB>` |
| Diff latest snapshot vs working file | `pnpm snap --diff-current <path>` |
| Restore a saved version (backs up current file first) | `pnpm snap --restore <path> <safeTs>` |

The **`safeTs`** id is the first column from `--list`.

## Evaluator defaults (Settings → Evaluator defaults)

When `config/feature-flags.json` enables **Auto-improve**, **Settings** (gear) → **Evaluator defaults** sets **global defaults** for **maximum revision rounds**, optional **target quality score**, and **rubric weights**. Those defaults apply only when a hypothesis run uses Auto-improve. With the checked-in `autoImprove: 0` flag, the tab and per-node toggle are hidden and every design run is a single agentic build with no evaluator. Env defaults (`AGENTIC_MAX_REVISION_ROUNDS`, `AGENTIC_MIN_OVERALL_SCORE`) are served in `**GET /api/config`** and seed the UI once before you customize; see [ARCHITECTURE.md](ARCHITECTURE.md).

## Canvas Workflow

The working canvas lives at `/canvas`. Nodes connect left-to-right. You need a **viewport at least 1024px wide**; narrower screens show a desktop-only message instead of the canvas (see [README.md](README.md)). The **build stamp** in the header (version · Eastern time) and Husky **patch** bumps are documented in [AGENTS.md](AGENTS.md) — including restarting Vite to refresh the stamp after commits.

### 1. Fill in Input Nodes

The canvas starts with a **Design Brief**, a **Design System**, and an **Incubator**. Spec input nodes connect into the Incubator; the Design System stays in the input column and connects to hypotheses for design execution. Optional input facets appear as ghost cards; use the circular **Add to canvas** control on a ghost to materialize that input node.

- **Design Brief** — The primary directive. What are you designing and why?
- **Research Context** — User research, behavioral insights, qualitative findings.
- **Objectives & Metrics** — Success criteria, KPIs, evaluation measures.
- **Design Constraints** — Non-negotiable boundaries + exploration ranges.
- **Design System** — Tokens, components, patterns, brand notes, screenshots, and Markdown source files.

Write in prose, not bullets. Precision is the product.

**Optional inputs:** The default template focuses on Design Brief + Design System + Incubator. Other sections may show as **ghost** prompts on the canvas until you add them from the ghost card (or load a saved canvas whose spec already fills that section—see **Managing Canvases**). Ghost cards are persistent affordances and reappear if you remove the optional input node; when you activate one, the viewport tracks the newly created node after it moves into the input group.

**Auto-generate (Research / Objectives / Constraints):** On those three input nodes, an **auto-generate** action (when shown) drafts or refines the spec facet body from your **Design Brief** and any other spec sections you have already filled in. The provider + model + thinking level come from **Settings → Reasoning → Inputs**. **Lockdown** still pins provider/model server-side.

### 2. Pick model + thinking level in Settings

Open **Settings → Reasoning** to choose, per task, the **provider + model** and the **thinking level** you want (Off / Low / Medium / High / Extra High). Each task — Hypothesis design, Incubator, Inputs, Design system, and, when Auto-improve is enabled, Evaluator — keeps its own choice. When **lockdown** is enabled in `config/feature-flags.json`, every run uses the per-task pins from `config/task-defaults.json` and the model pickers are disabled. Thinking levels still apply only to reasoning-capable models; non-reasoning models resolve to `off` on the server.

### 3. Incubate

Connect spec input nodes to the **Incubator** (structural edges auto-connect on add and stay protected). With at least a minimal **Design Brief** written, click **Generate** and choose how many new hypotheses to create. The Incubator uses **Settings → Reasoning → Incubator** for the model + thinking level. It sends active sources — filled spec inputs and connected preview references — to the LLM and produces that many hypothesis strategy cards. **blank hypothesis** does the same readiness check (brief + model) but adds a single empty strategy card without calling the LLM, for hand-editing.

After the first run, the primary button reads **Generate more** instead of **Generate** — re-clicking adds fresh hypotheses while passing the existing cards back as anti-repetition context, so subsequent clicks explore directions you haven't seen yet rather than producing paraphrases. A single run typically leaves variety on the table; click **Generate more** until you've seen enough.

The **Brainstorm directions first** toggle on the Incubator is off by default. When enabled, the server runs a divergent brainstorm + spread-curation pair before the incubator stage and stitches the five curated directions into the brief — the incubator anchors against those candidates. Use it for open-ended briefs when you want a wider corpus; skip it on tightly-scoped briefs (medical handoff, regulated domains) where brainstorming over-conditions the model. Expect ~50% more wall time on that incubator run.

The Design System is intentionally outside hypothesis incubation. Non-default design-system guidance applies later when a hypothesis is designed, so hypothesis quality is judged against the problem framing before visual-system execution.

### 4. Edit Hypotheses

Hypothesis nodes appear to the right of the Incubator. Each represents a hypothesis strategy with:

- **Name** — Editable label (double-click or pencil icon)
- **Hypothesis** — The core design hypothesis
- **Details** (expandable) — Rationale, measurements

Edit these before generation. Remove strategies not worth exploring.

### 5. Design System

The **Design System** node is an optional visual-system input for design execution. It starts in **Default** mode, which excludes design-system guidance and lets the model choose an appropriate visual direction from the hypothesis and spec. It connects to hypotheses when a visual-system source should guide the generated design; it does not connect to the Incubator.

- Keep **Default** to use no explicit design-system guidance
- Switch to **Wireframe** to use Designer's built-in low-fidelity `DESIGN.md` source
- Switch to **Custom** to type or paste DESIGN.md, tokens, style-guide prose, or brand notes
- Drag-and-drop design-system screenshots, reference images, or DESIGN.md files when custom source material matters

### 6. Generate Designs

Each hypothesis has built-in generation controls at the bottom. Click **Design** to run the **agentic** engine: the agent plans files, writes/edits/validates them, and streams progress to the preview. The provider + model + thinking level for the design run come from **Settings → Reasoning → Hypothesis design**.

**Auto-improve** (when enabled by `config/feature-flags.json`): when **off**, the run stops after that **single** agent build—**no** evaluator, no scorecard. When **on**, the server runs **evaluation** (LLM rubrics plus browser QA) and can apply **revision passes** from that feedback, up to the max rounds and optional target score (overridable per node; **Settings → Evaluator defaults** sets the baseline). With the checked-in `autoImprove: 0` flag, this control is hidden and all runs are single-pass. See **[PRODUCT.md](PRODUCT.md)** for the full pipeline.

Runs often take several minutes (shorter when Auto-improve is off). **Server at capacity:** the API enforces a cap of `MAX_CONCURRENT_AGENTIC_RUNS` (default 5) parallel agentic runs; when every slot is busy, **Design** turns into a greyed **“Server busy (N/M)”** hint — wait for a run to finish instead of retrying. When Auto-improve was on, the preview includes an **evaluation summary** and, if Playwright is installed, a small **browser capture** under Runtime QA. Generated HTML may use **Google Fonts** only via `fonts.googleapis.com` / `fonts.gstatic.com` (needs network in your browser for preview); other CDNs stay disallowed — see [ARCHITECTURE.md](ARCHITECTURE.md).

Running generation again adds new versions — use the version navigation arrows on the preview card to browse previous results.

**While a run is in flight:** Use **Stop** on the **hypothesis** card to abort the in-flight request for that strategy lane (same as ending the SSE stream).

**Progress and workspace:** Starting **Design** does **not** auto-open the run workspace—the preview card shows progress first. Use **Watch agent** or the **panel** icon on the preview toolbar to open the **run workspace** (an overlay on the right). Canvas zoom shortcuts and pinch gestures belong to the canvas area, including preview cards; the run workspace does not zoom the graph. The preview card footer summarizes live status with a **three-state chip** that shows what the model is doing right now: 🧠 Brain for extended reasoning, 💬 for narrating (visible text between tool calls), and 🔧 Wrench for an active tool call; the token count keeps ticking through every phase. When a thinking turn ends, a transient **`🧠 Xs`** badge briefly shows how long it reasoned. **Skills in use** and the full **Monitor** timeline—including tool traces—live in the workspace. The timeline’s **Tool use** block shows the active tool in the header when collapsed; when expanded, each streaming tool row uses the same pulse + `Nk tok` pattern as the chip.

**Removing nodes from the canvas:** Use **Backspace** or **Delete** with one or more nodes selected. A short confirmation appears for nodes that can be removed (input cards and structural nodes like the incubator stay protected). Removing a hypothesis also drops its preview nodes. Optional selected connections, such as preview-reference edges, delete with the same keys and no extra dialog; structural source-to-Incubator edges stay protected. The shared spec document is separate; text in section cards may still exist there until you edit it elsewhere.

### 7. Review Designs

Preview nodes render generated designs as canvas thumbnails. They show the result and version controls, but generated-design interaction belongs in full-screen preview or the **run workspace**. Open the **run workspace** (panel icon or **Watch agent** while generating) for the full timeline, tasks, **Design**/**Evaluation** tabs (when evaluation ran), and—when a run had several evaluator rounds—a shared **Eval round** control on Design and Evaluation to preview that round’s files and scores.

**Best pick** *(Auto-improve enabled only)*: Use **Mark as best** (star on the preview toolbar or “Mark as best” in full-screen) to pin a preferred result. **Clear best pick** restores the computed default for that strategy lane (highest evaluator score when available, otherwise newest complete run). Full-screen **prev/next design** moves between preview nodes **for the same hypothesis** when domain slots are present.

**Single-file results:**

- **Zoom** — +/- buttons or auto-fit
- **Source** — Toggle Preview/Source to see the raw HTML
- **Full-screen** — Click the expand icon for full-viewport preview

**Multi-file (agentic) results:**

- **Preview tab** — Serves the virtual tree from `**/api/preview/sessions`** in the iframe (relative links work). If registration or URL verification fails, falls back to a bundled `**srcDoc`**. See [PRODUCT.md](PRODUCT.md).
- **Code tab** — File explorer on the left, raw file content on the right
- **Download** — Zip button downloads all files as a `.zip` archive
- **Eval strip** — When Auto-improve ran, aggregate score, suggested fixes, and runtime QA (including optional headless screenshot)
- **Full-screen** — Same as single-file

**Version badges** — v1, v2, etc. with ChevronLeft/Right to browse accumulated versions across runs.

### 8. Iterate

To iterate on results:

- **Reference code** — Connect a preview to an Incubator to pass the prior design into the next **incubate** run as a **reference design** in the prompt.
- **Re-incubate** — The Incubator reads **reference designs** (and input-node facets from the spec) from its connected nodes, producing improved hypotheses. When Auto-improve is enabled and on for a generation run, evaluator feedback and revision passes appear in the preview run workspace scorecard.

### Layout

Auto-layout is implicit canvas behavior. The graph repositions after structural changes such as adding/removing nodes, connecting nodes, incubation, generation, and measured node-size changes. The left canvas toolbar controls canvas zoom, fit view, minimap visibility, and **Column spacing**; trackpad pinch over the canvas also zooms the graph. Browser page zoom is separate from canvas zoom, and app dialogs keep a stable readable size across page zoom. There is no persisted Auto layout toggle.

## Managing Canvases

Click **Canvas Manager** in the header:

- **Save Current** — Snapshot the active canvas to the browser library
- **New Canvas** — Saves the current canvas, creates a blank canvas
- **Duplicate** — Creates a copy for iteration
- **Export Canvas** — Downloads a self-contained canvas `.json` bundle where practical
- **Import Canvas** — Loads a previously exported canvas bundle; legacy spec-only JSON still imports
- **Load** — Saves the current canvas, then switches to a saved canvas
- **Reload saved** — Explicitly discards unsaved active changes and reloads the saved copy
- **Delete** — Remove a saved canvas from the browser library

Saved canvases include the graph, viewport, inputs, per-task settings, domain wiring, incubator state, generated preview metadata, version selections, best-pick overrides, and generated artifacts. Purely transient UI state such as open modals, hover/focus, and live stream internals is not saved. Replacing actions stop active runs before checkpointing so late stream callbacks cannot mutate the newly loaded canvas.
