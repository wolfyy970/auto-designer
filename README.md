# Designer

**Read the [North Star](PRODUCT.md#north-star) first.** Every decision in this repo serves that ambition.

**Picking up after a break (humans and AI):** Prior chats are not retained—treat **this repository** as the source of truth. Start with **[AGENTS.md](AGENTS.md)** (commands and gotchas), **[PRODUCT.md](PRODUCT.md)** (product intent), and **[ARCHITECTURE.md](ARCHITECTURE.md)** for implementation depth. Optional: `git log -10 --oneline` for the latest merged work.

Designer opens on a public home page, then the working canvas lives at `/canvas`. A design brief feeds the **Incubator**, which produces hypothesis strategies that systematically explore the solution space; each hypothesis then generates a rendered design. Product behavior lives in [PRODUCT.md](PRODUCT.md); day-to-day workflow lives in [USER_GUIDE.md](USER_GUIDE.md).

## Quick Start

```bash
pnpm install
cp .env.example .env.local  # add your API keys
# Optional: install Chromium for browser-grounded evaluation when Auto-improve is enabled.
pnpm exec playwright install chromium
pnpm dev:all                 # recommended: API + Vite (API waits until /api/health is up)
# Or two terminals: pnpm dev:server  then  pnpm dev
```

Both processes are required for local development. The Vite dev server proxies `/api/*` to the Hono server (default port **4731**; override with **`PORT`**). If only Vite is up, the app stays on a full-screen **API server not reachable** gate (with retry) until **`GET /api/config`** succeeds—start the API with **`pnpm dev:all`** or **`pnpm dev:server`**, or hard-refresh after the API is listening.

**Screen width:** The canvas workspace needs a **desktop-class** layout. Browser viewports **narrower than 1024px** (typical phones and many tablets) show a full-screen message asking you to open the app on a laptop or desktop instead.

**`EADDRINUSE` on the API port:** Something is still bound to **`PORT`** (default **4731**) — often a **background** `pnpm dev:server` left over from `pnpm dev:server & pnpm dev` after `Ctrl+C` (check `jobs` / `fg`; or free the port: `lsof -nP -iTCP:4731 -sTCP:LISTEN` then `kill <pid>`). Prefer **`pnpm dev:all`** or **two terminals** so you don't stack servers.

### API Configuration


| Key                           | Where to get it                                | Required       | What it does                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENROUTER_API_KEY`          | [openrouter.ai](https://openrouter.ai)         | For OpenRouter | Server-side only — proxied via Vite, never exposed to browser                                                                                                                                                                                                                                                      |
| `LMSTUDIO_URL`                | Local (default: `http://localhost:1234`)       | For LM Studio  | Local inference endpoint; `VITE_LMSTUDIO_URL` is still accepted as a legacy alias                                                                                                                                                                                                                                  |
| `VITE_LMSTUDIO_VISION_MODELS` | N/A                                            | Optional       | Comma-separated model ID substrings that support vision                                                                                                                                                                                                                                                            |
| `VITE_LOGROCKET_APP_ID`       | [logrocket.com](https://app.logrocket.com)     | Optional       | Enables [LogRocket](https://logrocket.com) session replay (e.g. `org/app`). Production builds default to `qbwhsc/designer-6dify` when unset; dev builds stay off unless this is set. Detail: [AGENTS.md § Errors and optional telemetry](AGENTS.md#errors-and-optional-telemetry).                                  |


Product flags live in [config/feature-flags.json](config/feature-flags.json). See `.env.example` for env-only keys and [config/README.md](config/README.md) for checked-in defaults.

## Canvas Workflow

The primary working interface is a visual node-graph canvas (`/canvas`): spec inputs feed the Incubator, hypothesis cards generate designs, and preview nodes show the results. For actual usage, use [USER_GUIDE.md](USER_GUIDE.md). For feature semantics, use [PRODUCT.md](PRODUCT.md). For routes, stores, and data flow, use [ARCHITECTURE.md](ARCHITECTURE.md). Token semantics live only in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Scripts


| Command             | What it does                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Start Vite SPA dev server (default port **4732**; override with **`VITE_PORT`**)                                                                                                                                         |
| `pnpm dev:server`   | Start Hono API server (default port **4731**; override with **`PORT`**)                                                                                                                                                  |
| `pnpm dev:all`      | Start API then Vite (waits for `/api/health` — avoids proxy race)                                                                                                                        |
| `pnpm dev:kill`     | Stop processes listening on default API (**4731**) and Vite (**4732**) ports (`PORT` / `VITE_PORT` when set)                                                                                                           |
| `pnpm build`        | Type-check and production build                                                                                                                                                          |
| `pnpm test`         | Root Vitest suite plus `@auto-designer/design-system` and `@auto-designer/pi` package tests (Playwright merge test excluded in config; **`pnpm test:playwright-eval`** runs it — see [AGENTS.md](AGENTS.md)) |
| `pnpm lint`         | Run ESLint                                                                                                                                                                               |
| `pnpm knip`         | Optional unused **files** and **dependencies** report via Knip (`--include files,dependencies`; not run in CI by default)                                                                |
| `pnpm snap`         | Checkpoint prompt/skill/rubric versions (changed files only); list/diff/restore subcommands ([USER_GUIDE.md](USER_GUIDE.md#version-history)) |


## Documentation

**AI coding agents:** Full repo conventions live in **[AGENTS.md](AGENTS.md)** (vendor-neutral name). **[CLAUDE.md](CLAUDE.md)** exists only so **Claude Code** auto-loads a pointer to **AGENTS.md**—do not maintain two copies of the same guidance.


| Document                                         | Purpose                                                                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                           | **Canonical** agent instructions: commands, architecture **pointers**, skill-based prompts, gotchas ([Pi sandbox detail](ARCHITECTURE.md#pi-design-sandbox) in **ARCHITECTURE**) |
| [CLAUDE.md](CLAUDE.md)                           | Stub for Claude Code → links **AGENTS.md**                                                                                                                                                            |
| [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)         | Narrative: canvas, prompts, agentic loop, evaluation                                                                                                                                                  |
| [RUNTIME_FLOW.md](RUNTIME_FLOW.md)               | Canonical runtime flow, prompt/skill inventory, and internal exploration-axis model                                                                                                                   |
| [PRODUCT.md](PRODUCT.md)                         | **North Star** + feature-level description: modes, nodes, providers                                                                                                                                   |
| [USER_GUIDE.md](USER_GUIDE.md)                   | Setup and day-to-day canvas workflow                                                                                                                                                                  |
| [config/README.md](config/README.md)             | Human-editable JSON knobs for feature flags, defaults, evaluator thresholds, browser scoring, and content limits                                                                                       |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)             | Canonical SPA design-system reference: token semantics, atoms, typography, themes, and package workflow                                                                                 |
| [ARCHITECTURE.md](ARCHITECTURE.md)               | Technical reference: routes, stores, data flow, Pi adapter boundary, **Pi sandbox** (layers, tool inventory, edit cascade)                                                                            |
| [EXPERIMENTER.md](EXPERIMENTER.md)               | Discovery overview of the in-repo experimentation surface: what it is, how to run it, and what the matrix experiments have already promoted into production                                            |
| [experiments/README.md](experiments/README.md)   | Experiments CLI deep-dive: flags, run directories, transcripts, paired critique loop                                                                                                                  |
| [DOCUMENTATION.md](DOCUMENTATION.md)             | How this doc set is organized (hub = this README)                                                                                                                                                     |


## Deploying

V1 production can run on **Vercel Pro** (`vercel.json` + `api/[[...route]].js` → Hono, `maxDuration = 800`) with bounded synchronous SSE streams. Users must keep the browser tab/request open while long design runs execute; if the connection drops, the in-flight run cannot be resumed and must be started again. Set `OPENROUTER_API_KEY`; set `ALLOWED_ORIGINS` when the SPA origin differs from `/api`; set `PREVIEW_PUBLIC_URL` to the production origin when server-side browser evaluation must call a public preview URL. `vercel.json` also sets `NODEJS_HELPERS=0`, which the Hono Vercel adapter needs for raw streaming request/response handling. The home page and canvas use `/api/provider-status/openrouter` to show OpenRouter budget availability without exposing key details. See [ARCHITECTURE.md § Deployment](ARCHITECTURE.md#deployment).

Ephemeral **preview sessions** may not persist across separate serverless invocations—the UI falls back to bundled **`srcDoc`** when a preview URL 404s (relative links in that mode are limited).

## Tech Stack

Vite + React 19 + TypeScript, Zustand, Tailwind CSS v4, @xyflow/react v12, react-router-dom v7, @tanstack/react-query, Zod, and Vitest. Agentic mode uses the package-owned Pi integration described in [ARCHITECTURE.md](ARCHITECTURE.md).
