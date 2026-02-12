# Architecture

## Four Abstraction Layers

```
┌─────────────────────────────────────────────┐
│  UI Layer (React components)                │
│  Canvas (primary) │ Legacy form pages       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  1. Spec Model                              │
│  DesignSpec → 5 SpecSections + images       │
│  types/spec.ts, stores/spec-store.ts        │
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
│  3. Generation Provider Interface           │
│  CompiledPrompt → GenerationResult (code)   │
│  services/providers/{claude,lmstudio}.ts    │
│  Multimodal vision support                  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Output Rendering                        │
│  Code → sandboxed iframe (srcdoc)           │
│  Canvas VariantNode / legacy VariantFrame   │
└─────────────────────────────────────────────┘
```

Each layer is independent. The UI can change without touching the compiler. The compiler can swap models without touching providers. Providers can be added without touching anything else.

## Data Flow

```
DesignSpec (freeform text + images)
    │
    ▼ compileSpec()
DimensionMap (dimensions + variant strategies)
    │
    ▼ designer edits hypotheses on canvas
    │
    ▼ compileVariantPrompts()
CompiledPrompt[] (one full prompt per variant)
    │
    ▼ provider.generate()
GenerationResult[] (HTML/React code per variant)
    │
    ▼ iframe srcdoc attribute
Rendered variants (sandboxed, interactive)
    │
    ▼ optional: variant → Existing Design (screenshot capture)
Next iteration cycle
```

## Canvas Architecture

The primary interface is a node-graph canvas built on `@xyflow/react` v12.

### Node Types

10 node types in 3 categories: 5 input (section) nodes rendered by shared `SectionNode.tsx`, plus `CompilerNode`, `HypothesisNode`, `GeneratorNode`, `VariantNode`, and `CritiqueNode`.

### Auto-Layout

Edge-driven Sugiyama-style algorithm in `canvas-store.ts`:
1. Build directed adjacency from edges
2. Assign ranks via longest-path DFS (cycle-safe)
3. Group nodes into layers, sort by parent barycenter
4. Stack each layer using measured heights, centered on tallest layer
5. Nudge single-node layers toward parent/child averages

Toggled via checkbox in header. When on, nodes are not draggable.

### State Management

`canvas-store.ts` — Zustand with persist. Owns nodes, edges, viewport, layout preferences, generation counter. Provides orchestration actions: `syncAfterCompile`, `syncAfterGenerate`, `applyAutoLayout`.

## Module Boundaries

### Types (`src/types/`)

| File | Key types |
|------|-----------|
| `spec.ts` | `DesignSpec`, `SpecSection`, `ReferenceImage`, `SpecSectionId` |
| `compiler.ts` | `DimensionMap`, `VariantStrategy`, `Dimension`, `CompiledPrompt` |
| `provider.ts` | `GenerationProvider`, `GenerationResult`, `ProviderOptions`, `ContentPart`, `ProviderModel` |

### Stores (`src/stores/`)

| Store | Persistence | What it owns |
|-------|-------------|--------------|
| `spec-store` | localStorage | Active `DesignSpec`, section/image CRUD |
| `compiler-store` | localStorage | `DimensionMap` per compiler node, `CompiledPrompt[]`, variant editing |
| `generation-store` | localStorage | `GenerationResult[]`, generation status |
| `canvas-store` | localStorage | Nodes, edges, viewport, auto-layout, generation counter |

### Services (`src/services/`)

| File | Responsibility |
|------|---------------|
| `compiler.ts` | `compileSpec()`, `compileVariantPrompts()`, `callLLM()` — routes to provider |
| `providers/claude.ts` | OpenRouter provider — chat completions, model listing, vision support |
| `providers/lmstudio.ts` | LM Studio provider — OpenAI-compatible endpoint, vision support |
| `providers/registry.ts` | Provider registration and lookup |

### Shared Utilities (`src/lib/`)

| File | Purpose |
|------|---------|
| `extract-code.ts` | LLM response → code extraction (fence detection, raw code fallback) |
| `iframe-utils.ts` | React code wrapping, HTML detection, screenshot capture |
| `constants.ts` | Default prompts, provider defaults |
| `prompts/` | System/user prompts for compiler and variant generation |
| `generation-badge-colors.ts` | Generation badge color cycling |
| `utils.ts` | `generateId()`, `interpolate()`, `envNewlines()` |

### Canvas Components (`src/components/canvas/`)

| File | Purpose |
|------|---------|
| `CanvasWorkspace.tsx` | ReactFlow wrapper, connection handling, screenshot capture |
| `CanvasHeader.tsx` | Title editing, auto-layout toggle, navigation |
| `CanvasToolbar.tsx` | Node palette, minimap/grid toggles |
| `CanvasContextMenu.tsx` | Right-click add nodes at position |
| `VariantPreviewOverlay.tsx` | Full-screen variant preview |
| `nodes/` | 6 node components + type registry |
| `edges/` | Custom DataFlowEdge with animated status |
| `hooks/useCanvasOrchestrator.ts` | Syncs spec/compiler/generation stores → canvas nodes |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useGenerate.ts` | Shared generation orchestration (sequential, with progress) |
| `useProviderModels.ts` | React Query hook for dynamic model fetching |
| `useLineageDim.ts` | Lineage highlighting for selected nodes |

## Key Design Decisions

**Why localStorage, not a database.** Local-first single-user tool. A spec is ~50KB of JSON. Images are base64 data URLs. localStorage handles this fine up to ~5MB.

**Why API keys proxied server-side.** `OPENROUTER_API_KEY` (no `VITE_` prefix) is only available to the Vite dev server proxy, never bundled into client code. LM Studio runs on a local network and doesn't need keys.

**Why sandboxed iframes with srcdoc.** Generated code is untrusted. `sandbox="allow-scripts"` enables JS but blocks navigation, forms, and parent DOM access. `allow-same-origin` deliberately omitted.

**Why independent provider selection.** Compilation needs high reasoning (expensive). Generation needs consistent code output (can be cheaper/local). Decoupled selection lets you use the best tool for each job.

**Why edge-driven auto-layout.** Pure type-based column assignment breaks when nodes have feedback connections (variant → existing design). The Sugiyama-style algorithm assigns ranks from actual edge connections, handles cycles, and uses measured heights to prevent overlap.

## Adding a New Provider

1. Create `src/services/providers/yourprovider.ts`
2. Implement the `GenerationProvider` interface from `types/provider.ts` (including `listModels()` with `supportsVision`)
3. Register it in `src/services/providers/registry.ts`
4. Add the provider to `callLLM()` in `src/services/compiler.ts` for compilation support

The provider receives a `CompiledPrompt` (full prompt text + reference images) and returns a `GenerationResult` (code string + metadata). Vision-capable models receive images as multimodal `ContentPart[]` in the user message.
