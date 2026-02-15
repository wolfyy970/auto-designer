# User Guide

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Add your API key to `.env.local`:
```
OPENROUTER_API_KEY=sk-or-...
```

This key stays server-side (Vite proxy). Alternatively, enter an OpenRouter key via the Settings panel (gear icon in header) — keys entered there are stored in localStorage.

For LM Studio vision models, optionally set:
```
VITE_LMSTUDIO_VISION_MODELS=llava,minicpm-v,qwen2-vl
```

```bash
pnpm dev
```

## Canvas Workflow

The canvas (`/canvas`) is the default interface. Nodes connect left-to-right.

### 1. Fill in Input Nodes

The canvas starts with a **Design Brief** node and an **Incubator**. Add more input nodes from the toolbar:

- **Design Brief** — The primary directive. What are you designing and why?
- **Existing Design** — Describe what exists today. Drag-and-drop screenshots as reference images.
- **Research Context** — User research, behavioral insights, qualitative findings.
- **Objectives & Metrics** — Success criteria, KPIs, evaluation measures.
- **Design Constraints** — Non-negotiable boundaries + exploration ranges.

Write in prose, not bullets. Precision is the product.

### 2. Incubate (Compile)

Connect input nodes to the **Incubator** (edges auto-connect on add). Select a provider and model, then click **Generate**. The Incubator sends your connected inputs to the LLM and produces hypothesis strategies.

### 3. Edit Hypotheses

Hypothesis nodes appear to the right of the Incubator. Each represents a variant strategy with:
- **Name** — Editable label
- **Primary Emphasis** — Which dimensions this variant pushes on
- **Details** (expandable) — Rationale, how it differs, coupled decisions

Edit these before generation. Remove strategies not worth exploring.

### 4. Add Design System (Optional)

Add a **Design System** node from the toolbar (Processing group). It auto-connects to all existing hypotheses. You can have multiple design system nodes — e.g., one for Material Design tokens, another for a custom system. Each hypothesis uses the design tokens from its connected design system(s).

- Type or paste design tokens directly into the content area
- Drag-and-drop screenshots of existing design systems, then click **Extract from Images** to have an LLM read the tokens from the images

### 5. Generate Variants

Each hypothesis has built-in generation controls. Select a provider, model, and output format (HTML or React), then click **Create**. Variants appear to the right. Running generation again adds new versions — use the version navigation arrows to browse previous results.

### 6. Review Variants

Variant nodes render the generated code in sandboxed iframes:
- **Zoom** — +/- buttons or auto-fit
- **Source view** — Toggle Preview/Source to see the raw code
- **Full-screen** — Click the expand icon for full-viewport preview with version navigation
- **Version badges** — v1, v2, etc. with ChevronLeft/Right to browse accumulated versions

### 7. Iterate

To iterate on results:
- **Screenshot feedback** — Drag a connection from a variant's right handle to the Existing Design node. This captures a screenshot and adds it as a reference image.
- **Critique** — Add a Critique node, connect a variant to it, write structured feedback (strengths, improvements, direction), then connect the critique to a new Incubator.
- **Re-incubate** — The Incubator reads reference designs and critiques from its connected inputs, producing improved hypotheses.

### Auto-Layout

Toggle the **Auto Layout** checkbox in the header. When on:
- All nodes are positioned automatically based on their connections
- Nodes are not draggable (prevents accidental misalignment)
- Layout updates after compilation, generation, adding/removing nodes, or new connections

When off, drag nodes freely.

## Managing Specs

Click **Specs** in the header to open the Spec Manager:

- **Save Current** — Snapshot the active spec to localStorage
- **New Spec** — Saves the current spec, creates a blank one
- **Duplicate** — Creates a copy for iteration
- **Export JSON** — Downloads the spec as a `.json` file
- **Import JSON** — Loads a previously exported spec
- **Load** — Switch to a saved spec
- **Delete** — Remove a saved spec from localStorage

## Legacy Form Workflow

The original page-based workflow remains at `/editor` → `/compiler` → `/generation`. Same spec model and compiler, different UI.
