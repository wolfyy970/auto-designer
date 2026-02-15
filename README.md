# Auto Designer

A specification workspace that helps designers define design problem boundaries before AI generation, then compiles those specifications into variant prompts that systematically explore the solution space.

Designers write structured specs. The compiler reasons about the exploration space. Generation providers produce code variants. Everything connects on a visual node-graph canvas.

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # add your API keys
pnpm dev                     # http://localhost:5173
```

### API Configuration

| Key | Where to get it | Required | What it does |
|-----|----------------|----------|--------------|
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) | For OpenRouter | Server-side only — proxied via Vite, never exposed to browser |
| `VITE_LMSTUDIO_URL` | Local (default: `http://192.168.252.213:1234`) | For LM Studio | Local inference endpoint |
| `VITE_LMSTUDIO_VISION_MODELS` | N/A | Optional | Comma-separated model ID substrings that support vision |

You can mix and match providers — e.g. OpenRouter Claude for compilation, LM Studio for generation. See `.env.example` for all options.

## Canvas Workflow

The primary interface is a visual node-graph canvas (`/canvas`, the default route):

1. **Input nodes** (left) — Design Brief, Existing Design, Research Context, Objectives & Metrics, Design Constraints
2. **Incubator** — Connect input nodes, select a model, click Generate to produce hypothesis strategies
3. **Hypotheses** — Editable strategy cards with built-in generation controls. Select a provider, model, and format, then click Create.
4. **Design System** (optional) — Connect to hypotheses to inject design tokens into generation. Supports multiple systems for A/B exploration.
5. **Variants** — Rendered design previews with zoom, version navigation, and full-screen. Results accumulate across runs.

Nodes connect left-to-right. Auto-layout arranges everything based on connections. Variants can connect back to Existing Design for iterative feedback loops (captures a screenshot automatically).

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Serve production build locally |

## Documentation

| Document | Purpose |
|----------|---------|
| [PRODUCT.md](PRODUCT.md) | What exists today — features, canvas nodes, providers |
| [USER_GUIDE.md](USER_GUIDE.md) | How to use the canvas workflow |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, module boundaries |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Documentation philosophy and rules |
| [design-spec-workspace-product-spec.md](design-spec-workspace-product-spec.md) | Original product specification |

## Tech Stack

Vite + React 19 + TypeScript, Zustand (state), Tailwind CSS v4 (styling), @xyflow/react v12 (canvas), react-router-dom v7 (routing), @tanstack/react-query (async state), Vitest (testing). See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
