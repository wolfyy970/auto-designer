# System overview (end-to-end)

This document is the **narrative** companion to [ARCHITECTURE.md](ARCHITECTURE.md): how prompts, the canvas, and the agentic engine fit together. Every subsystem described below serves the [North Star](PRODUCT.md#north-star). For file-level maps and API tables, use ARCHITECTURE; for day-to-day usage, [USER_GUIDE.md](USER_GUIDE.md).

---

## What the user does on the canvas

1. **Source inputs (left column)** — Four spec facets hold structured text (Design Brief, Research Context, Objectives & Metrics, Design Constraints), and the required Design System node holds either the built-in Wireframe source, custom visual-system text/Markdown/images, or an explicit None state. Spec-facet content is mirrored into the **spec store**; Design System content stays on the node.
2. **Incubator** — Connects **spec input nodes** and optional **preview → incubator** reference designs. It turns the connected context into an **incubation plan**: differentiated hypothesis strategies.
3. **Hypothesis nodes** — Each card is one strategy. **Design** runs the agentic generation loop. Domain state owns workflow relations, and the graph is a projection kept in sync by app commands.
4. **Design system node** — Required source input for design execution. It controls whether generated work receives the built-in Wireframe design system, custom source material, or no design-system guidance.
5. **Preview nodes** — Show iframe previews (URL-backed virtual FS for agentic multi-file), zip downloads, and evaluation summaries. Versions stack per strategy; previews can feed the Incubator as prior-output reference designs.

Generation runs as a browser-held stream in the hosted v1 path; durable background jobs remain a future boundary.

---

## Prompts and where they come from

Prompt and skill bodies are repo-owned package content, resolved server-side for each task. This overview only names that boundary; prompt roles and runtime flow live in [RUNTIME_FLOW.md](RUNTIME_FLOW.md). Implementation mechanics live in [ARCHITECTURE.md](ARCHITECTURE.md), and editing workflow plus version snapshots live in [USER_GUIDE.md](USER_GUIDE.md#prompts-and-skills-editing-the-repo).

---

## PI engine (agentic generation)

**Swap boundary** — The Pi integration is isolated behind the app’s package boundary so the host code does not depend directly on Pi SDK internals. File-level ownership lives in [ARCHITECTURE.md](ARCHITECTURE.md).

**Sandbox** — The agent writes to an in-memory project tree, and app-specific tools translate those changes into streamed preview files. No model-callable tool touches the real repo. Tool inventory and package guardrails live in [ARCHITECTURE.md § Pi design sandbox](ARCHITECTURE.md#pi-design-sandbox).

**Loop** — The agent iterates over a virtual project, streams progress and files back to the preview, and can continue with evaluation context during revision rounds.

**Evaluation and revision** — Product behavior is summarized in [PRODUCT.md](PRODUCT.md); implementation details live in [ARCHITECTURE.md](ARCHITECTURE.md).

**Deployment runtime** — V1 production uses Vercel Pro bounded synchronous SSE functions. If the browser/server connection drops, the active run cannot resume and the UI tells the user to start again. Durable background jobs remain a future v2 boundary, not part of the first hosted path.

---

## Client/server boundary (mental model)

- **Browser:** Canvas UI, Zustand, IndexedDB for code/files, workspace DTO submission, API client with shared Zod request/response contracts and SSE helpers for framing, JSON parsing, dispatch, and lane routing.
- **Server:** All provider keys, **incubate**, generate, hypothesis multiplex, design-system extract, logs. Task and hypothesis routes validate shared wire contracts before building context from `hypothesis-generation-pure.ts`.

---

## Where to read next


| Topic                         | Document                             |
| ----------------------------- | ------------------------------------ |
| API routes, stores, file map  | [ARCHITECTURE.md](ARCHITECTURE.md)   |
| Feature list and modes        | [PRODUCT.md](PRODUCT.md)             |
| Runtime flow and prompt/skill roles | [RUNTIME_FLOW.md](RUNTIME_FLOW.md) |
| Step-by-step canvas usage     | [USER_GUIDE.md](USER_GUIDE.md)       |
| Repo commands / agent gotchas | [AGENTS.md](AGENTS.md)               |
| How we maintain docs          | [DOCUMENTATION.md](DOCUMENTATION.md) |
