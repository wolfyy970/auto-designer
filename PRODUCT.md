# Product -- What Exists Today

**Status:** MVP complete. Not yet tested end-to-end with real API keys.

## Features

### Spec Editor (`/editor`)

Eight freeform text sections that define a design problem space:

| Section | Required | Purpose |
|---------|----------|---------|
| Existing Design | No | What exists today -- screenshots, what works/fails |
| Decision Context | Yes | User state at moment of interaction -- intent, knowledge, emotion |
| Need & Insight | Yes | Human need + research insight framing the opportunity |
| Business Objective | Yes | What the business needs -- metric, time horizon, unit economics |
| Constraints | Yes | Non-negotiable boundaries -- brand, accessibility, legal, technical |
| Exploration Space | Yes | What varies across variants and the ranges for each dimension |
| Evaluation Framework | Yes | How to judge outputs -- metrics, guardrails, thresholds |
| Ethical Guardrails | Yes | What the system must never produce -- dark patterns, manipulation |

- All fields are freeform text (no checkboxes or dropdowns)
- Reference image upload via drag-and-drop on the Existing Design section
- Images stored as base64 data URLs
- Content auto-saves to localStorage

### Spec Compilation

- Compile button at bottom of Spec Editor (`/editor`)
- Sends full spec to OpenRouter LLM (default: Claude Sonnet)
- Automatically navigates to Exploration Space on success

### Exploration Space (`/compiler`)

- Displays **dimension map**: identified dimensions + 4-6 variant strategies
- Each strategy has: name, primary emphasis, rationale, how it differs, coupled decisions
- Edit strategy names, emphasis, rationale
- Add new strategies manually
- Remove strategies not worth exploring
- Reorder strategies (up/down)
- Re-compile to get a fresh map from the LLM
- **Approve & Continue** compiles strategies into generation prompts

### Code Generation (`/generation`)

- Always uses OpenRouter (provider selection removed for simplicity)
- Model selector (Claude, GPT-4o, Gemini, etc.)
- Output format toggle: HTML or React
- Per-variant status tracking (generating/complete/error)
- Generates all variants sequentially

### Variant Rendering

- **Tab-based layout** - one variant visible at a time for full-width viewing
- Generated code renders in sandboxed iframes using `srcdoc` attribute
- Sandbox: `allow-scripts` only (no same-origin, no forms, no navigation)
- Preview/Source toggle per variant
- Strategy metadata displayed above each variant
- React output wrapped in CDN-loaded runtime template
- Responsive: variants use full viewport width

### Persistence

- Auto-save via Zustand `persist` middleware (localStorage)
- Spec Manager modal: save, load, duplicate, delete specs
- JSON export/import for sharing and backup
- Settings modal for entering API keys in-browser

## What's Not Built Yet

- Image context extraction (vision LLM for design DNA)
- Canvas/node-based interface (React Flow)
- Agent orchestration (Aegra/LangGraph)
- Self-hosted inference (vLLM)
- Experimentation/deployment integration
- Spec version history
- Role-based collaboration
