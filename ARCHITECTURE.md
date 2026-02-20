# Architecture

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
│  2. Prompt Compiler                         │
│  Spec → DimensionMap → CompiledPrompt[]     │
│  services/compiler.ts, lib/prompts/         │
│  Providers: OpenRouter, LM Studio           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Agentic Generation Engine               │
│  CompiledPrompt → VirtualWorkspace → HTML   │
│  services/agent/orchestrator.ts             │
│  services/agent/workspace.ts                │
│  Phase 1: Planning (JSON build plan)        │
│  Phase 2: Build loop (XML tool calls)       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Output Rendering                        │
│  HTML → sandboxed iframe (srcdoc)           │
│  Canvas VariantNode                         │
└─────────────────────────────────────────────┘
```

Each layer is independent. The UI can change without touching the compiler. The compiler can swap models without touching providers. The agentic engine can be upgraded without touching any other layer.

## Data Flow

```
DesignSpec (freeform text + images)
    │
    ▼ compileSpec()
DimensionMap (dimensions + variant strategies)
    │
    ▼ user edits hypotheses on canvas
    │
    ▼ compileVariantPrompts() (with optional designSystemOverride)
CompiledPrompt[] (one full prompt per variant)
    │
    ▼ runAgenticBuild()
    │  Phase 1: plannerLLM → BuildPlan (JSON)
    │  Phase 2: builderLLM loop → VirtualWorkspace (file system)
    │  bundleToHtml() → self-contained HTML
    │  code → IndexedDB, metadata → localStorage
    │
    ▼ iframe srcdoc attribute
Rendered variants (sandboxed, interactive)
    │
    ▼ optional: variant → Existing Design (screenshot capture)
Next iteration cycle
```

## Agentic Engine

The generation engine (`services/agent/`) breaks LLM output token limits via an iterative tool-calling loop. It is an independently upgradeable module.

### VirtualWorkspace (`workspace.ts`)

An in-memory file system. The LLM writes files into it via tool calls; the workspace assembles them into a single HTML document after the loop completes.

- `writeFile(path, content)` — creates or overwrites; normalizes leading slashes
- `readFile(path)` — returns content or undefined
- `patchFile(path, search, replace)` — targeted string replacement with multi-strategy fuzzy matching (exact, line-trimmed, indentation-flexible, block-anchored, Levenshtein). Saves tokens on large files while tolerating LLM whitespace drift.
- `validateWorkspace(plannedPaths)` — checks that all planned files were written and reports structural warnings
- `bundleToHtml()` — injects CSS into `<head>` and JS before `</body>`, wraps everything in the HTML file

### Build Loop (`orchestrator.ts`)

`runAgenticBuild(builderSystemPrompt, userContext, provider, options)`:

1. **Planning pass** (optional, enabled by passing `plannerSystemPrompt`): single LLM call returns a JSON `BuildPlan` with intent, palette, typography, layout, and a precise file list. On parse failure, falls back gracefully — build continues without a plan.

2. **Build loop**: starts with `[system, user + buildPlanContext]` message array. Each iteration:
   - Calls `provider.generateChat(messages, options)`
   - Parses tool calls via three strategies: strict XML tags (`<write_file>`, `<edit_file>`, `<finish_build>`), permissive Markdown fenced-block fallback (for models like Gemini that ignore XML), and plan-aware file path alignment. `finish_build` is always processed last regardless of response ordering.
   - Executes tools against `VirtualWorkspace`
   - Appends tool feedback as a user message (success or structured `AgentToolError`)
   - Nudges the model if no tool calls are detected
   - Reports progress via `onProgress` callback (phase labels, file writes, elapsed status)
   - Stops when `finish_build` is called or `maxLoops` is reached
   - Runs a validation correction pass: if planned files are missing, re-enters the loop to request them

### Provider Interface

```typescript
interface GenerationProvider {
  generateChat(messages: ChatMessage[], options: ProviderOptions): Promise<ChatResponse>;
  listModels(): Promise<ProviderModel[]>;
  isAvailable(): boolean;
  supportsImages: boolean;
  supportsParallel: boolean;
}
```

`generateChat` takes the full conversation array — enabling the stateful, multi-turn build loop. Both OpenRouter and LM Studio providers implement this interface.

## Canvas Architecture

The primary interface is a node-graph canvas built on `@xyflow/react` v12.

### Node Types

11 node types in 3 categories: 5 input nodes rendered by shared `SectionNode.tsx`, plus `ModelNode`, `DesignSystemNode`, `CompilerNode`, `HypothesisNode`, `VariantNode`, and `CritiqueNode`. `ModelNode` centralizes provider/model selection — processing nodes read config from a connected Model node via `useConnectedModel` hook. Design System is self-contained (data in `node.data`, not spec store). Each node uses a typed data interface from `types/canvas-data.ts` and a shared `NodeHeader`.

### Auto-Layout

Edge-driven Sugiyama-style algorithm in `canvas-layout.ts`:
1. Build directed adjacency from edges
2. Assign ranks via longest-path DFS (cycle-safe)
3. Force designSystem nodes to compiler rank, disconnected variants to variant rank
4. Group nodes into layers, sort by parent barycenter
5. Stack each layer using measured heights, centered on tallest layer
6. Nudge single-node layers toward parent/child averages

Toggled via checkbox in header. When on, nodes are not draggable.

### Version Stacking

Results accumulate across generation runs. Each result has a `runId` (UUID) and `runNumber` (sequential per hypothesis). Variant nodes reuse the same canvas node across runs, with ChevronLeft/Right navigation to browse versions. Fork detection: if provider/model changes, existing variants are pinned (archived) and new ones created.

### State Management

`canvas-store.ts` — Zustand with persist. Owns nodes, edges, viewport, layout preferences. Provides orchestration actions: `syncAfterCompile`, `syncAfterGenerate`, `applyAutoLayout`, `forkHypothesisVariants`. Migration logic extracted to `canvas-migrations.ts` (version chain v0→v13).

## Module Boundaries

### Types (`src/types/`)

| File | Key types |
|------|-----------|
| `spec.ts` | `DesignSpec`, `SpecSection`, `ReferenceImage`, `SpecSectionId` (Zod schemas + inferred types) |
| `compiler.ts` | `DimensionMap`, `VariantStrategy`, `Dimension`, `CompiledPrompt` |
| `provider.ts` | `GenerationProvider`, `GenerationResult`, `ProviderOptions`, `ChatResponse`, `ContentPart`, `ProviderModel` |
| `canvas-data.ts` | Per-node typed data interfaces (`HypothesisNodeData`, `VariantNodeData`, `DesignSystemNodeData`, etc.) |

### Stores (`src/stores/`)

| Store | Persistence | What it owns |
|-------|-------------|--------------|
| `spec-store` | localStorage | Active `DesignSpec`, section/image CRUD |
| `compiler-store` | localStorage | `DimensionMap` per compiler node, `CompiledPrompt[]`, variant editing |
| `generation-store` | localStorage + IndexedDB | `GenerationResult[]` metadata in localStorage, code in IndexedDB. Version stacking via `runId`/`runNumber`. |
| `canvas-store` | localStorage | Nodes, edges, viewport, auto-layout preferences |
| `prompt-store` | localStorage | Prompt template overrides (all prompts: planner, builder, compiler, variant, design system extract) |
| `theme-store` | localStorage | Theme preference (light/dark/system) |

### Services (`src/services/`)

| File | Responsibility |
|------|---------------|
| `compiler.ts` | `compileSpec()`, `compileVariantPrompts()`, `callLLM()` — routes to provider |
| `agent/orchestrator.ts` | `runAgenticBuild()` — planning pass + iterative build loop with XML tool parsing |
| `agent/workspace.ts` | `VirtualWorkspace` — in-memory file system, CSS/JS bundling |
| `providers/claude.ts` | OpenRouter provider — `generateChat()`, model listing, vision support |
| `providers/lmstudio.ts` | LM Studio provider — OpenAI-compatible endpoint, vision support |
| `providers/registry.ts` | Provider registration and lookup |
| `persistence.ts` | `DesignSpec` CRUD via localStorage with Zod validation |
| `idb-storage.ts` | IndexedDB helpers via idb-keyval (code + provenance stores, garbage collection) |
| `migration.ts` | One-time localStorage→IndexedDB migration (runs before stores hydrate) |

### Shared Utilities (`src/lib/`)

| File | Purpose |
|------|---------|
| `extract-code.ts` | LLM response → code extraction (fence detection, raw code fallback) |
| `iframe-utils.ts` | React code wrapping, HTML detection, screenshot capture |
| `constants.ts` | Provider defaults, env overrides |
| `storage-keys.ts` | Centralized localStorage key constants |
| `prompts/defaults.ts` | Default prompt text for all prompts (planner, builder, compiler, variant, design system) |
| `prompts/helpers.ts` | Spec section content extraction, image line collection |
| `badge-colors.ts` | Version badge color cycling (v1, v2, etc.) |
| `canvas-layout.ts` | Auto-layout algorithm (Sugiyama-style), grid snapping, column positions |
| `canvas-connections.ts` | Valid connection rules between node types |
| `canvas-graph.ts` | Graph traversal helpers for compilation inputs |
| `provider-helpers.ts` | Multimodal content building, chat request construction, native tool calling utilities |
| `error-utils.ts` | `normalizeError()` + `AgentToolError` (structured tool failure reporting) |
| `utils.ts` | `generateId()`, `interpolate()`, `envNewlines()` |

### Canvas Components (`src/components/canvas/`)

| File | Purpose |
|------|---------|
| `CanvasWorkspace.tsx` | ReactFlow wrapper, connection handling |
| `CanvasHeader.tsx` | Title editing, auto-layout toggle, navigation |
| `CanvasToolbar.tsx` | Node palette, minimap/grid toggles |
| `CanvasContextMenu.tsx` | Right-click add nodes at position |
| `VariantPreviewOverlay.tsx` | Full-screen variant preview with version navigation |
| `nodes/` | 7 node components + shared sub-components (`NodeHeader`, `VariantToolbar`, `VariantFooter`, `CompactField`) + type registry |
| `edges/` | Custom DataFlowEdge with animated status |
| `hooks/useCanvasOrchestrator.ts` | Syncs spec/compiler/generation stores → canvas nodes |
| `hooks/useNodeDeletion.ts` | Keyboard deletion with system node protection and cascade deletion |
| `hooks/useFeedbackLoopConnection.ts` | Screenshot capture when variant connects to Existing Design |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useGenerate.ts` | Shared generation orchestration — calls `runAgenticBuild()`, handles version stacking, IndexedDB writes, provenance |
| `useHypothesisGeneration.ts` | Generation orchestration specific to hypothesis nodes |
| `useVersionStack.ts` | Version navigation state management for variant nodes |
| `useVariantZoom.ts` | Zoom/resize logic for variant previews (ResizeObserver + clamping) |
| `useProviderModels.ts` | React Query hook for dynamic model fetching |
| `useResultCode.ts` | Async hook to load generated code from IndexedDB. Accepts an optional `reloadTrigger` to auto-refetch when generation status changes. |
| `useNodeProviderModel.ts` | Per-node provider/model selection persisted in canvas node data (used by ModelNode) |
| `useConnectedModel.ts` | Reads provider/model config from a connected Model node via edge traversal |
| `useLineageDim.ts` | Lineage highlighting for selected nodes |
| `useThemeEffect.ts` | Applies dark/light class to document based on theme store |

## Key Design Decisions

**Why a two-phase agentic engine.** Single-shot generation is bounded by the LLM's output token limit (typically 4K–64K tokens). A well-designed UI variant — structured HTML, comprehensive CSS, interactive JS — can easily exceed this. The planning pass constrains the problem space before code is written; the build loop then executes one bounded file at a time. Total output is unbounded.

**Why XML tool calls instead of native function calling.** The XML format is model-agnostic and works identically across OpenRouter and LM Studio. It also makes the prompt fully inspectable and user-editable via the Prompt Editor, which is a core product value.

**Why localStorage + IndexedDB.** Local-first single-user tool. Specs and store metadata fit in localStorage (~50KB). Generated code and provenance snapshots go to IndexedDB to avoid the ~5MB localStorage limit. Migration runs once on startup.

**Why API keys proxied server-side.** `OPENROUTER_API_KEY` (no `VITE_` prefix) is only available to the Vite dev server proxy, never bundled into client code. LM Studio runs on a local network and doesn't need keys.

**Why sandboxed iframes with srcdoc.** Generated code is untrusted. `sandbox="allow-scripts"` enables JS but blocks navigation, forms, and parent DOM access. `allow-same-origin` deliberately omitted.

**Why independent provider selection via Model nodes.** Compilation needs high reasoning (expensive). Generation needs consistent code output (can be cheaper/local). Model nodes make provider/model selection a first-class canvas concept — visually explicit and composable.

**Why edge-driven auto-layout.** Pure type-based column assignment breaks when nodes have feedback connections (variant → existing design). The Sugiyama-style algorithm assigns ranks from actual edge connections, handles cycles, and uses measured heights to prevent overlap.

**Why Zod at persistence boundaries.** `DesignSpec` loaded from localStorage or imported from files is validated at parse time. Invalid data returns an empty state and logs a warning rather than crashing. Schema types are derived from Zod schemas (`z.infer<typeof DesignSpecSchema>`) so runtime validation and static types stay in sync.

## Adding a New Provider

1. Create `src/services/providers/yourprovider.ts`
2. Implement the `GenerationProvider` interface from `types/provider.ts` — specifically `generateChat()` for the agentic loop, plus `listModels()` and `isAvailable()`
3. Register it in `src/services/providers/registry.ts`
4. Add the provider to `callLLM()` in `src/services/compiler.ts` for compilation support

The provider receives a `ChatMessage[]` array and returns `{ raw: string }`. The agentic engine handles all message history management.
