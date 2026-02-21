# Architecture

## Client-Server Overview

```
┌─────────────────────────────────────────────┐
│  Vercel Platform                            │
│                                             │
│  CDN ─── Static SPA (Vite build)           │
│  /api/* ─── Serverless Function (Hono)     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Browser (React SPA)                        │
│  Canvas UI → API Client → /api/*           │
│  Zustand stores (UI state)                 │
│  StoragePort (IndexedDB — swappable)       │
└─────────────────────────────────────────────┘
```

**Client** — React SPA with Zustand stores, `@xyflow/react` canvas, IndexedDB for generated code. Makes REST and SSE calls to `/api/*`.

**Server** — Hono app deployed as a Vercel serverless function. Handles all LLM orchestration: compilation, single-shot generation, model listing, design system extraction. Holds API keys server-side.

**Local dev** — Two processes: Vite (SPA + HMR on 5173) and Hono (API on 3001 via `tsx watch`). Vite proxy forwards `/api/*` to Hono.

## Four Abstraction Layers

```
┌─────────────────────────────────────────────┐
│  UI Layer (React components)                │
│  Canvas (primary, only route)               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  1. Spec Model                              │
│  DesignSpec → 5 SpecSections + images       │
│  types/spec.ts (Zod-validated)              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  2. API Client + Prompt Compiler            │
│  Client: compileVariantPrompts() (local)    │
│  Server: compileSpec() → DimensionMap       │
│  Server: provider.generateChat() → HTML     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Storage Abstraction                     │
│  StoragePort interface (swappable)          │
│  BrowserStorage → IndexedDB                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Output Rendering                        │
│  HTML → sandboxed iframe (srcdoc)           │
│  Canvas VariantNode                         │
└─────────────────────────────────────────────┘
```

## Data Flow

```
DesignSpec (freeform text + images)
    │
    ▼ POST /api/compile  (client sends spec + prompt overrides)
DimensionMap (dimensions + variant strategies)
    │
    ▼ user edits hypotheses on canvas
    │
    ▼ compileVariantPrompts() runs client-side (prompt assembly only)
CompiledPrompt[] (one full prompt per variant)
    │
    ▼ POST /api/generate  (SSE stream per variant)
    │  Server: provider.generateChat(messages) → raw HTML
    │  SSE events: progress, code, done
    │  Client: code → StoragePort (IndexedDB), metadata → Zustand
    │
    ▼ iframe srcdoc attribute
Rendered variants (sandboxed, interactive)
    │
    ▼ optional: variant → Existing Design (screenshot capture)
Next iteration cycle
```

## API Surface

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/api/compile` | POST | Compile spec into dimension map | JSON: `DimensionMap` |
| `/api/generate` | POST | Generate one variant (single-shot) | SSE stream: progress, code, done |
| `/api/models/:provider` | GET | List available models | JSON: `ProviderModel[]` |
| `/api/models` | GET | List available providers | JSON: `ProviderInfo[]` |
| `/api/logs` | GET | Fetch LLM call log entries (dev-only) | JSON: `LlmLogEntry[]` |
| `/api/logs` | DELETE | Clear log entries (dev-only) | 204 |
| `/api/design-system/extract` | POST | Extract design tokens from screenshots | JSON: extracted tokens |
| `/api/health` | GET | Health check | JSON: `{ ok: true }` |

All POST endpoints validate request bodies with Zod `safeParse` — malformed requests return a structured `400` before any LLM call is made.

## Server Architecture (`server/`)

| File | Responsibility |
|------|---------------|
| `app.ts` | Hono app: mounts routes, CORS |
| `env.ts` | `process.env` config (replaces `import.meta.env`) |
| `dev.ts` | Local dev entry (Hono + `@hono/node-server` on 3001) |
| `log-store.ts` | In-memory LLM call log (dev-only, no Zustand) |
| `routes/compile.ts` | POST /api/compile |
| `routes/generate.ts` | POST /api/generate (SSE stream) |
| `routes/models.ts` | GET /api/models/:provider |
| `routes/logs.ts` | GET/DELETE /api/logs |
| `routes/design-system.ts` | POST /api/design-system/extract |
| `services/agent/orchestrator.ts` | Agentic build loop — inactive stub, preserved for future use |
| `services/agent/workspace.ts` | VirtualWorkspace — inactive stub, preserved for future use |
| `services/compiler.ts` | LLM compilation (moved from client) |
| `services/providers/openrouter.ts` | OpenRouter provider (direct API, auth header) |
| `services/providers/lmstudio.ts` | LM Studio provider (direct URL) |
| `services/providers/registry.ts` | Provider registration and lookup |
| `lib/provider-helpers.ts` | Shared fetch helpers (moved from client) |
| `lib/prompts/*` | Prompt defaults (imports from shared `src/lib/prompts/shared-defaults.ts`) and template builders |
| `lib/extract-code.ts` | Code extraction from LLM responses |
| `lib/error-utils.ts` | Error normalization |
| `lib/utils.ts` | ID generation, interpolation |

## Generation Engine

Generation is a single LLM call per hypothesis-model pair (`server/routes/generate.ts`).

The route:
1. Validates the request with Zod
2. Resolves the `genSystemHtml` system prompt (default or client-provided override)
3. Calls `provider.generateChat([system, user], options)`
4. Extracts the HTML code block from the response
5. Streams three SSE events: `progress` (start), `code` (HTML), `done`

The client streams the SSE response, saves the code to StoragePort (IndexedDB), and updates Zustand metadata.

### Generation Cancellation

SSE is unidirectional. The client holds an `AbortController` and calls `abort()` on unmount or user cancellation. The server checks `c.req.raw.signal.aborted` to detect client disconnection.

### Agentic Engine (Inactive Stub)

`server/services/agent/orchestrator.ts` and `workspace.ts` preserve a multi-file agentic build loop for future use. It implements a two-phase planner + builder loop with VirtualWorkspace, fuzzy patching, and Markdown fallback parsing. Currently inactive — not called from any active route. Fully tested via `src/services/__tests__/orchestrator.test.ts`.

## Canvas Architecture

The primary interface is a node-graph canvas built on `@xyflow/react` v12.

### Node Types

11 node types in 3 categories: 5 input nodes rendered by shared `SectionNode.tsx`, plus `ModelNode`, `DesignSystemNode`, `CompilerNode`, `HypothesisNode`, `VariantNode`, and `CritiqueNode`. `ModelNode` centralizes provider/model selection. Design System is self-contained (data in `node.data`, not spec store). Each node uses a typed data interface from `types/canvas-data.ts`.

### Auto-Connection Logic (`canvas-connections.ts`)

Centralized rules for what connects to what when nodes are added or generated:

- **`buildAutoConnectEdges`** — Structural connections only: section→compiler, design system→hypothesis.
- **`buildModelEdgeForNode`** — When a node is added from the palette, connects it to the first available Model node on the canvas.
- **`buildModelEdgesFromParent`** — When hypotheses are generated from an Incubator, they inherit that Incubator's connected Model — not every Model on the canvas.

Model connections are column-scoped: a Model node connects only to adjacent-column nodes.

### Lineage & Dimming (`canvas-graph.ts`)

`computeLineage` performs a full connected-component walk (bidirectional BFS). Selecting a node highlights every node reachable through any chain of edges — including sibling inputs to shared targets. Unconnected nodes dim to 40%.

### Version Stacking

Results accumulate across generation runs. Each result has a `runId` (UUID) and `runNumber` (sequential per hypothesis). Variant nodes reuse the same canvas node across runs, with version navigation.

### Parallel Generation

Multiple hypotheses generate simultaneously via `Promise.all`. Within a single hypothesis, multiple connected Models also generate in parallel. The global `isGenerating` flag only clears when all in-flight results reach a terminal status, preventing premature UI resets.

## Client Module Boundaries

### Types (`src/types/`)

| File | Key types |
|------|-----------|
| `spec.ts` | `DesignSpec`, `SpecSection`, `ReferenceImage` (Zod schemas) |
| `compiler.ts` | `DimensionMap`, `VariantStrategy`, `CompiledPrompt` |
| `provider.ts` | `GenerationProvider`, `GenerationResult`, `ChatMessage`, `ProviderOptions`, `ChatResponse`, `ContentPart`, `ProviderModel` |
| `canvas-data.ts` | Per-node typed data interfaces |

### API Client (`src/api/`)

| File | Purpose |
|------|---------|
| `client.ts` | REST + SSE fetch wrappers with AbortController support |
| `types.ts` | Request/response interfaces for all endpoints |

### Storage (`src/storage/`)

| File | Purpose |
|------|---------|
| `types.ts` | `StoragePort` interface — swappable storage backend |
| `browser-storage.ts` | `BrowserStorage` — wraps `idb-storage.ts` for IndexedDB |
| `index.ts` | Default storage export |

### Stores (`src/stores/`)

| Store | Persistence | What it owns |
|-------|-------------|--------------|
| `spec-store` | localStorage | Active `DesignSpec`, section/image CRUD |
| `compiler-store` | localStorage | `DimensionMap` per compiler node, `CompiledPrompt[]`, variant editing |
| `generation-store` | localStorage + StoragePort | `GenerationResult[]` metadata in localStorage, code in IndexedDB via StoragePort |
| `canvas-store` | localStorage | Nodes, edges, viewport, auto-layout preferences |
| `prompt-store` | localStorage | Prompt template overrides (sent as per-request overrides to server) |
| `theme-store` | — | Theme mode (always `dark`; static store) |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useGenerate.ts` | Generation orchestration — calls `apiClient.generate()` SSE stream, saves code to StoragePort |
| `useHypothesisGeneration.ts` | Generation orchestration for hypothesis nodes |
| `useProviderModels.ts` | React Query hook — calls `apiClient.listModels()` |
| `useResultCode.ts` | Loads generated code from StoragePort |
| `useConnectedModel.ts` | Reads provider/model config from a connected Model node |

## Key Design Decisions

**Why a Hono server on Vercel.** All LLM orchestration runs server-side. API keys never reach the browser. LLM calls and SSE streaming run in a serverless function. Vercel supports 300s timeout (Hobby) or 800s (Pro) for streaming functions — sufficient for single-shot generation.

**Why prompts are sent per-request.** The prompt store lives in the browser (localStorage). The server is stateless — it carries defaults and applies client-provided overrides. No shared state between server and client beyond the request payload.

**Why `src/lib/prompts/shared-defaults.ts`.** Prompt text is the same on client and server. A single shared module (`shared-defaults.ts`) is the one source of truth. Both `src/lib/prompts/defaults.ts` (client) and `server/lib/prompts/defaults.ts` (server) import from it. `tsconfig.server.json` explicitly includes the file.

**Why SSE for generation.** Each variant is a separate SSE stream. Events: `activity` (thinking, file writes), `progress` (phase labels), `code` (final HTML), `error`, `done`. The client manages sequencing across variants.

**Why StoragePort.** Generated code currently lives in IndexedDB (browser-local). The `StoragePort` abstraction allows swapping to a server-backed database later without changing any consuming code.

**Why LM Studio is local-dev only.** Vercel serverless functions can't reach `localhost:1234`. In production, only cloud providers (OpenRouter) work.

**Why two TypeScript configs.** `tsconfig.app.json` targets the browser (DOM lib, JSX, Vite types). `tsconfig.server.json` targets Node.js (no DOM). Prevents browser globals from leaking into server code.

**Why sandboxed iframes with srcdoc.** Generated code is untrusted. `sandbox="allow-scripts"` enables JS but blocks navigation, forms, and parent DOM access.

## Adding a New Provider

1. Create `server/services/providers/yourprovider.ts`
2. Implement the `GenerationProvider` interface from `src/types/provider.ts`
3. Register it in `server/services/providers/registry.ts`
4. Add the provider config to `getProviderConfig()` in `server/services/compiler.ts`

## Deployment

**Vercel:**
- `vercel.json` configures static output from `dist/` and API routes via `api/[[...route]].ts`
- Set `OPENROUTER_API_KEY` as a Vercel environment variable
- `npm run build` produces the SPA; Vercel bundles the serverless function automatically

**Local dev:**
- `npm run dev` — Vite dev server (port 5173)
- `npm run dev:server` — Hono API server (port 3001)
- Vite proxy forwards `/api/*` to Hono
