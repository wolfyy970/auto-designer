# Auto Designer

A specification workspace that helps designers define design problem boundaries before AI generation, then compiles those specifications into variant prompts that systematically explore the solution space.

Designers write structured specs. The compiler reasons about the exploration space. Generation providers produce code variants. Rendered side-by-side for comparison.

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # add your API keys
pnpm dev                     # http://localhost:5173
```

### API Configuration

| Key | Where to get it | Required | What it does |
|-----|----------------|----------|--------------|
| `VITE_OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) | For OpenRouter | Powers compilation and/or generation via Claude, GPT-4o, Gemini, etc. |
| `VITE_LMSTUDIO_URL` | Local (default: `http://192.168.252.213:1234`) | For LM Studio | Local inference endpoint for compilation and/or generation |

You can mix and match providers. For example: use OpenRouter Claude Opus for compilation (best reasoning) and local LM Studio for generation (fast and free). Configure defaults in `.env.local` or select per-use in the UI.

## Workflow

1. **Write a spec** (`/editor`) -- Fill in the 8-section structured document, then compile at the bottom
2. **Exploration Space** (`/compiler`) -- Review the LLM-generated dimension map with variant strategies
3. **Approve** -- Edit strategies as needed, then approve to generate variant prompts
4. **Variants** (`/generation`) -- Generate code variants, compare in full-width tabs

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and production build |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Serve production build locally |

## Documentation

| Document | Purpose |
|----------|---------|
| [PRODUCT.md](PRODUCT.md) | What exists today -- features, sections, providers |
| [USER_GUIDE.md](USER_GUIDE.md) | How to use each part of the workflow |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, module boundaries |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Documentation philosophy and rules |
| [design-spec-workspace-product-spec.md](design-spec-workspace-product-spec.md) | Original product specification |

## Tech Stack

Vite + React 19 + TypeScript, Zustand (state), Tailwind CSS v4 (styling), react-router-dom v7 (routing), @tanstack/react-query (async state). See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
