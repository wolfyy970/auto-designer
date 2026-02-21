# Product — What Exists Today

**Status:** Canvas interface complete. Agentic generation engine operational. Vision support implemented.

## Canvas Interface (`/canvas` — default route)

A visual node-graph workspace built on @xyflow/react v12. Nodes connect left-to-right representing the design exploration pipeline.

### Node Types

| Node | Type | Purpose |
|------|------|---------|
| Design Brief | Input | Primary directive for the design exploration |
| Existing Design | Input | What exists today — text + reference images (drag-and-drop) |
| Research Context | Input | User research, behavioral insights |
| Objectives & Metrics | Input | Success criteria and evaluation measures |
| Design Constraints | Input | Non-negotiable boundaries + exploration ranges |
| Model | Processing | Centralizes provider + model selection. Connect to Compiler, Hypothesis, or Design System nodes to configure which LLM they use. |
| Design System | Processing | Self-contained design token definitions. Supports multiple instances (e.g., Material Design vs custom tokens). Content stored in node data, not spec store. Optional vision-based extraction from uploaded images. |
| Incubator | Processing | Compiles connected inputs → hypothesis strategies via LLM |
| Hypothesis | Processing | Editable strategy card with built-in generation controls. Connect a Model node, then click Create to generate variants. |
| Variant | Output | Rendered design preview with zoom, source view, full-screen, and version navigation |
| Critique | Processing | Structured feedback (strengths, improvements, direction) for iteration |

### Canvas Features

- **Auto-layout** — Edge-driven Sugiyama-style layout. Toggleable checkbox in header. Positions all nodes based on connections, prevents overlap, centers layers vertically.
- **Auto-connect** — Adding a node auto-connects structural edges (sections→incubator, design systems→hypotheses). Model connections are scoped: when hypotheses are generated from an Incubator, they inherit that Incubator's model — not every model on the canvas.
- **Context menu** — Right-click canvas to add nodes at click position
- **Node palette** — Grouped picker (input/processing/output) in toolbar
- **Lineage highlighting** — Select a node to highlight its full connected component (siblings, ancestors, descendants). Unconnected nodes dim to 40% opacity.
- **Edge animations** — Custom DataFlowEdge with status indicators (idle/processing/complete/error)
- **Full-screen preview** — Expand any variant to full-screen overlay with version navigation
- **Reset canvas** — Reset button in header clears all nodes and re-initializes with the default template (Design Brief + Model + Incubator)
- **Screenshot capture** — Connect a variant to Existing Design to automatically capture a screenshot as a reference image for the next iteration
- **Version stacking** — Results accumulate across generation runs. Each variant shows version badges (v1, v2, ...) with ChevronLeft/Right navigation to browse previous versions.

### Iteration Loop

Variants can connect back to Existing Design (or to a Critique node, then to Incubator). This creates a feedback loop:
1. Generate variants
2. Connect best variant → Existing Design (captures screenshot) or add Critique
3. Re-incubate with the new context
4. Generate improved variants

## Agentic Generation Engine

Generation is not a single LLM call. It runs as a two-phase agentic loop:

**Phase 1 — Planning.** A dedicated planner LLM call reads the compiled hypothesis and returns a structured JSON build plan: intent, color palette, typography choices, layout strategy, and a precise file list with responsibilities. No code is written in this phase.

**Phase 2 — Build loop.** The builder receives the plan as context and executes it file by file, writing each file to an in-memory VirtualWorkspace via XML tool calls (`<write_file>`, `<edit_file>`, `<finish_build>`). Each response writes one file; the loop continues until the builder calls `finish_build` or reaches the max loop limit.

After the loop completes, the VirtualWorkspace bundles all files into a single self-contained HTML document for iframe rendering.

This two-phase approach overcomes LLM output token limits — the total output is unbounded because each API call handles a focused, bounded task.

**Cross-model compatibility.** The tool-call parser has three strategies: strict XML tag parsing, a permissive Markdown fenced-block fallback (for models like Gemini that respond with code blocks instead of XML), and plan-aware file path inference. This makes the engine model-agnostic.

**Fuzzy patching.** `edit_file` uses multi-strategy string matching (exact, line-trimmed, indentation-flexible, block-anchored, Levenshtein distance) to handle whitespace drift between what the LLM remembers and what's actually in the workspace.

**Real-time progress.** During generation, the variant node shows a live activity log, progress bar, and elapsed time. The file counter shows which file is currently being built (e.g., "2/3" means working on file 2 of 3). Driven by the orchestrator's `onProgress` and `onActivity` callbacks via SSE.

**Parallel generation.** Multiple hypotheses generate simultaneously when triggered. Within a single hypothesis, multiple connected Model nodes also generate in parallel. Progress and completion update independently per variant.

## Prompt Editor

All LLM prompts are exposed to the user and editable at runtime via the Prompt Editor (accessible from the canvas header):

| Prompt | Purpose |
|--------|---------|
| Incubator — System | Role, output format, and guidelines for dimension map production |
| Incubator — User | Template for spec data (variables: `{{SPEC_TITLE}}`, etc.) |
| Agent Designer — Planner | Single-shot planning prompt — produces JSON build plan |
| Agent Designer — Builder | Build loop system prompt — instructs tool usage |
| Designer — User | User prompt template for variant generation |
| Design System — Extract | Prompt for vision-based token extraction from screenshots |

Overrides persist in localStorage. Validation warns if required patterns are missing (e.g., JSON instruction for Planner, `<write_file>` instruction for Builder).

## Providers

| Provider | Compilation | Generation | Vision |
|----------|-------------|------------|--------|
| OpenRouter | Yes | Yes | Auto-detected from model metadata |
| LM Studio | Yes | Yes | Configurable via `VITE_LMSTUDIO_VISION_MODELS` env var |

- Both stages (compilation and generation) support independent provider + model selection via connected Model nodes
- Models fetched dynamically via each provider's API
- Vision-capable models show an eye icon in the model selector
- When vision is available, reference images are sent as multimodal content alongside text

## Persistence

- Store metadata auto-saves via Zustand `persist` middleware (localStorage)
- Generated code and provenance snapshots stored in IndexedDB (avoids localStorage size limits)
- Canvas Manager: save, load, duplicate, delete, export/import JSON
- Canvas state persists across sessions (nodes, edges, viewport, layout preferences)
- Automatic garbage collection removes orphaned IndexedDB entries on app startup

## What's Not Built Yet

- Self-hosted inference (vLLM)
- Experimentation/deployment integration
- Spec version history
- Role-based collaboration
