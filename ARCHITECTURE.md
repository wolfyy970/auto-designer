# Architecture

## Four Abstraction Layers

```
┌─────────────────────────────────────────────┐
│  UI Layer (React components)                │
│  Spec Editor → Dimension Map → Generation   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  1. Spec Model                              │
│  DesignSpec → 8 SpecSections + images       │
│  types/spec.ts, stores/spec-store.ts        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  2. Prompt Compiler                         │
│  Spec → DimensionMap → CompiledPrompt[]     │
│  services/compiler.ts, lib/prompts/         │
│  External: OpenRouter API                   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Generation Provider Interface           │
│  CompiledPrompt → GenerationResult (code)   │
│  services/providers/{preview,claude}.ts     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Output Rendering                        │
│  Code → sandboxed iframe (srcdoc)           │
│  components/output/VariantFrame.tsx         │
└─────────────────────────────────────────────┘
```

Each layer is independent. The UI can change (form → canvas) without touching the compiler. The compiler can swap models without touching providers. Providers can be added without touching anything else.

## Data Flow

```
DesignSpec (freeform text + images)
    │
    ▼ compileSpec()
DimensionMap (dimensions + variant strategies)
    │
    ▼ designer edits, approves
    │
    ▼ compileVariantPrompts()
CompiledPrompt[] (one full prompt per variant)
    │
    ▼ provider.generate()
GenerationResult[] (HTML/React code per variant)
    │
    ▼ iframe srcdoc attribute
Rendered variants (sandboxed, tab-based)
```

## Module Boundaries

### Types (`src/types/`)

All shared interfaces. No logic, no imports between type files except `compiler.ts → spec.ts` and `provider.ts → compiler.ts`.

| File | Key types |
|------|-----------|
| `spec.ts` | `DesignSpec`, `SpecSection`, `ReferenceImage`, `SpecSectionId` |
| `compiler.ts` | `DimensionMap`, `VariantStrategy`, `Dimension`, `CompiledPrompt` |
| `provider.ts` | `GenerationProvider`, `GenerationResult`, `ProviderOptions` |
| `workspace.ts` | `WorkspaceView`, `WorkspaceState` |

### Stores (`src/stores/`)

Zustand stores. Each owns a slice of state with actions to mutate it.

| Store | Persistence | What it owns |
|-------|-------------|--------------|
| `spec-store` | localStorage | Active `DesignSpec`, section/image CRUD |
| `compiler-store` | None | `DimensionMap`, `CompiledPrompt[]`, variant editing |
| `generation-store` | None | `GenerationResult[]`, generation status |
| `workspace-store` | None | Active view, active section |

### Services (`src/services/`)

Side-effect-ful code: API calls, file I/O, provider implementations.

| File | Responsibility |
|------|---------------|
| `openrouter.ts` | OpenRouter API client (chat completions) |
| `compiler.ts` | `compileSpec()` and `compileVariantPrompts()` |
| `persistence.ts` | Multi-spec localStorage CRUD, JSON export/import |
| `providers/preview.ts` | Returns prompt text as output |
| `providers/claude.ts` | OpenRouter generation provider (Claude, GPT-4o, Gemini, etc.) |
| `providers/registry.ts` | Provider registration and lookup |

### Prompts (`src/lib/prompts/`)

LLM prompt templates. Separated from services so they can be iterated independently.

| File | Purpose |
|------|---------|
| `compiler-system.ts` | System prompt: "you are a design exploration strategist" |
| `compiler-user.ts` | Serializes `DesignSpec` into structured text for the compiler |
| `variant-prompt.ts` | Assembles constraints + strategy into a generation prompt |

## Key Design Decisions

**Why localStorage, not a database.** MVP is a local-first single-user tool. A spec is ~50KB of JSON. Images are base64 data URLs. localStorage handles this fine up to ~5MB. IndexedDB is the escape hatch if image storage becomes a problem.

**Why API calls from the browser.** No backend server. LLM calls go through either OpenRouter's API or LM Studio (local) directly from the client. OpenRouter API key in `.env.local` (build-time injection) or localStorage (runtime). OpenRouter provides access to Claude, GPT-4o, Gemini, and others. LM Studio provides local inference with models like Qwen3 Coder Next.

**Why sandboxed iframes with srcdoc.** Generated code is untrusted. `sandbox="allow-scripts"` enables JS execution but blocks navigation, form submission, and parent DOM access. `allow-same-origin` is deliberately omitted to prevent localStorage/cookie access. The `srcdoc` attribute is used instead of `contentDocument.write()` for more reliable, declarative rendering that works with React's lifecycle.

**Why not React Hook Form or a rich text editor.** All spec inputs are `<textarea>`. Freeform text is the product's design decision -- the act of writing forces precision. No UI complexity needed.

**Why independent provider selection for compiler and generation.** The compiler needs high reasoning ability to analyze specs and create strategic dimension maps. Generation needs consistent code output. These requirements are different. You might want to use OpenRouter Claude Opus for compilation (expensive but smart) and local LM Studio for generation (fast and free). The `.env` schema supports independent provider + model tier configuration for each stage.

## Adding a New Provider

1. Create `src/services/providers/yourprovider.ts`
2. Implement the `GenerationProvider` interface from `types/provider.ts`
3. Register it in `src/services/providers/registry.ts`
4. Add the provider to `callLLM()` in `src/services/compiler.ts` for compilation support

The provider receives a `CompiledPrompt` (full prompt text + reference images) and returns a `GenerationResult` (code string + metadata). That's the entire contract.
