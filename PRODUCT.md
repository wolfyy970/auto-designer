# Product

## North Star

Designer exists to **assist the UX designer**. Think of it as similar to a pair programmer.

Given a problem statement and appropriate research, a good designer synthesizes everything — user needs, behavioral patterns, constraints — and produces design hypotheses that explore a solution landscape - maxima and minima. Then they execute those hypotheses into designs where every affordance is clear, every interaction is intuitive, time on task drops, and users never have to think. *Don't Make Me Think*, Nielsen Norman heuristics, information architecture, visual hierarchy — the entire discipline, applied at an expert level.

That is what this application must do autonomously. The ambition is not parity with the current design; it is to **surpass** it. Every feature, every prompt, every evaluation rubric, and every architectural decision exists to deliver against that standard. If a capability does not move the system closer to producing work a brilliant designer would be proud of, it does not belong here.

**Concretely, the pipeline has two jobs:**

1. **Hypothesis generation** — From a design brief (plus research, objectives, and constraints), produce strategies that are genuinely differentiated: not reshuffled templates, not minor variations, but fundamentally different bets about what will work best for the stated audience and problem. The bar is creative and strategic, not just technically valid.
2. **Design execution** — Turn each hypothesis into a rendered, usable artifact that implements the strategy with craft, clarity, and conviction. Typography, spacing, motion, content, interaction — all working together to embody the hypothesis so clearly that the design *is* the argument for why this approach works.

Every subsystem — the incubator, the agentic builder, the evaluator, the revision loop, the skills, the prompts — is measured against these two jobs. Ship work that a senior designer would look at and think: *I wish I'd done that.*

---

## What Exists Today

**Status:** Canvas interface complete. Hypothesis design uses the agentic Pi pipeline. With the checked-in `autoImprove: 0` flag, runs are single-pass builds; when that flag is enabled, the same pipeline adds post-build evaluation and bounded revision rounds. Runtime flow and prompt/skill roles live in [RUNTIME_FLOW.md](RUNTIME_FLOW.md); sandbox mechanics live in [ARCHITECTURE.md](ARCHITECTURE.md).

## Canvas Interface (`/canvas` — working route)

A visual node-graph workspace built on @xyflow/react v12. Nodes connect left-to-right representing the design exploration pipeline.

### Node Types


| Node                 | Type       | Purpose                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design Brief         | Input      | Primary directive for the design exploration                                                                                                                                                                                                                                                                                                                   |
| Research Context     | Input      | User research, behavioral insights                                                                                                                                                                                                                                                                                                                             |
| Objectives & Metrics | Input      | Success criteria and evaluation measures                                                                                                                                                                                                                                                                                                                       |
| Design Constraints   | Input      | Non-negotiable boundaries + exploration ranges                                                                                                                                                                                                                                                                                                                 |
| Design System        | Input      | Optional visual-system source for design execution. Defaults to Default mode with no design-system guidance, can switch to Wireframe or Custom text, DESIGN.md files, and images. Source material stays in node data and connects to hypotheses, not to the Incubator. |
| Incubator            | Processing | **Incubates** active sources into hypothesis strategies via LLM: filled spec inputs and connected preview references. It assembles those sources deterministically. **Generate** (batch count) and **blank hypothesis** both require a non-empty **Design Brief**; blank adds an empty strategy card without calling the LLM. |
| Hypothesis           | Processing | Editable strategy card with **Design** (always **agentic** Pi). **Auto-improve** disabled/off: single build, no evaluator. **On:** evaluation and optional revision rounds. |
| Preview              | Output     | Rendered design preview. Single-file results show an HTML iframe. Multi-file (agentic) results show a file explorer + preview/code tabs + zip download. When Auto-improve ran, completed agentic runs show an **evaluation scorecard**. Version navigation across all results. |


### Canvas Features

- **Desktop viewport gate** — Viewports under **1024px** width show a full-screen fallback (design-system styled) explaining the canvas workspace requires a larger display.
- **Auto-layout** — Edge-driven Sugiyama-style layout runs as implicit canvas behavior. Column spacing remains adjustable; layout itself is no longer a persisted toggle.
- **Auto-connect** — Fresh canvases start from the core pipeline, and graph/domain rules keep structural edges consistent (spec inputs/previews→incubator, design systems→hypotheses).
- **Lineage highlighting** — Select a node to highlight its full connected component (siblings, ancestors, descendants). Unconnected nodes dim to 40% opacity.
- **Edge animations** — Custom DataFlowEdge with status indicators (idle/processing/complete/error)
- **Full-screen preview** — Expand any preview to full-screen overlay: primary arrows step **other preview nodes on the same hypothesis** (domain `previewSlots`; falls back to canvas-wide if no slot). Inner control steps **version stack** (v1, v2, …) for that hypothesis strategy. When **Auto-improve** is enabled, **Mark as best** / **Clear best pick** lets the user override the computed best result for that lane (persisted in `generation-store`).
- **Reset canvas** — Reset button in header checkpoints the current canvas, then re-initializes with the default template (Design Brief + Design System + Incubator, plus optional-input ghost cards) and frames the starter workflow at a readable zoom.
- **Stop generation** — Aborts the active SSE / agent session for a hypothesis strategy lane (**Stop** on the hypothesis card while a run is in flight).
- **Permanent node delete** — Backspace/Delete with confirmation removes selected removable nodes from the canvas graph and keeps domain/incubator state consistent. Design Brief, Design System, Incubator, and input ghost nodes are protected.
- **Version stacking** — Results accumulate across generation runs. Each preview shows version badges (v1, v2, ...) with ChevronLeft/Right navigation to browse previous versions.
- **Agentic eval rounds (workspace)** — When a run has multiple evaluation rounds (build + revisions), the **preview run workspace** (overlay dock) can show **Eval round** on **Design** and **Evaluation** tabs; per-round file trees are stored in IndexedDB (`{resultId}:round:{n}`) so earlier revisions remain viewable without bloating localStorage metadata.
- **Inputs auto-generate** — On **Research Context**, **Objectives & Metrics**, and **Design Constraints**, optional **LLM-assisted drafting** from the Design Brief and other filled **spec** facets.
- **Optional input slots** — Fresh canvases can show **ghost** placeholders for inputs not in the minimal default. Ghosts are persistent affordances, not dismissible state. Loading a **Canvas Manager** entry **materializes** optional **input nodes** when the persisted spec has non-empty text or images for those facets (see `src/lib/spec-materialize-sections.ts`).
- **Design tokens kitchen sink** (development only) — Settings → General opens a modal reference for `@theme` tokens and patterns; full-page route `/dev/design-tokens`. Documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

### Iteration Loop

Previews can connect to **Incubator** as prior output reference code. This creates a feedback loop:

1. Generate designs
2. Connect a strong preview → Incubator
3. Re-incubate with the new context
4. Generate improved designs

Structured critique on **Auto-improve** runs comes from the **evaluator** (scorecard, fix list, revision rounds), not a separate canvas node. Single-pass runs skip evaluation entirely.

## Generation Engine

Each hypothesis produces a design through the **agentic** pipeline. **Evaluation** and **revision** run only when **Auto-improve** is enabled and on for that hypothesis. Runtime prompt and skill flow is documented in [RUNTIME_FLOW.md](RUNTIME_FLOW.md); server routes, SSE events, and store boundaries are documented in [ARCHITECTURE.md](ARCHITECTURE.md); day-to-day controls are documented in [USER_GUIDE.md](USER_GUIDE.md).

**Parallel generation.** Multiple hypotheses generate simultaneously. Progress and completion update independently per preview.

### Agentic design (and optional evaluation + revision)

Start a run with **Design** on the Hypothesis node. With **Auto-improve** disabled or off, the server runs one build and returns with no evaluator workers. With **Auto-improve** enabled and on, it runs **build → evaluate → optional revise loop**.

**User-visible phases:**

1. **Build** — PI multi-turn tool loop produces the file tree (streaming events: plan, files, activity, todos). Always runs.
2. **Evaluate** — *(Auto-improve on only.)* The scorecard appears on the preview.
3. **Revise** — *(Auto-improve on only.)* The system can apply bounded revision passes from the evaluation feedback.

**Live evaluation status.** When evaluation runs, SSE **`evaluation_worker_done`** updates the preview run workspace **Evaluation** tab (and tab affordance) with per-worker progress before the merged report.

**Multi-file output.** Agentic previews show a file explorer sidebar, Preview/Code tab bar, and a download button that produces a `.zip` file.

## Providers


| Provider   | Compilation | Generation | Vision metadata                                        |
| ---------- | ----------- | ---------- | ------------------------------------------------------ |
| OpenRouter | Yes         | Yes        | Auto-detected from model metadata                      |
| LM Studio  | Yes         | Yes        | Configurable via `VITE_LMSTUDIO_VISION_MODELS` env var |


- Each task can carry its own provider, model, and thinking-level selection when lockdown is off.
- Models fetched dynamically via each provider's API
- Vision-capable models show an eye icon in the model selector
- LM Studio runs sequentially (returns 500 on concurrent requests); OpenRouter runs in parallel

## Persistence

- Store metadata auto-saves via Zustand `persist` middleware (localStorage)
- Generated code and provenance snapshots stored in IndexedDB (avoids localStorage size limits)
- Agentic multi-file results stored in a separate IndexedDB object store (`files`)
- In-memory fields (`liveCode`, `liveFiles`, `liveFilesPlan`) are stripped from localStorage persistence
- Canvas Manager: full-workspace save, load, duplicate, delete, and export/import canvas JSON bundles. Replacing actions checkpoint the current canvas first; legacy spec-only imports still load.
- Canvas state persists across sessions (nodes, edges, viewport, layout preferences)
- Automatic garbage collection removes orphaned IndexedDB entries (code, provenance, and files stores) on app startup
