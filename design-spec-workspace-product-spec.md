# Design Specification Workspace — Product Spec

**Status:** Draft
**Last updated:** 2025-02-07
**Version:** 0.2

---

## Product Vision

### The Economic Shift

The marginal cost of producing working software is collapsing toward zero. Large language models made code generation near-instantaneous. Agentic scaffolding (tools like Claude Code and Cursor) added autonomy — a human sets a goal, the agent iterates toward it. Agent swarms take it further: multiple specialized agents coordinating in parallel, handling planning, coding, testing, and review at machine speed. Tools like Conductor run multiple agents in isolated git worktrees. Kimi K2.5 can self-direct 100 sub-agents executing 1,500 tool calls in parallel. Cursor demonstrated hundreds of agents running for a week straight, generating three million lines of code.

This isn't speculative. When SWE-bench launched in October 2023, AI systems solved under 2% of real-world GitHub issues autonomously. Today, top systems exceed 75%. Anthropic built Cowork — a general-purpose desktop agent — in approximately ten days, with the code written primarily by Claude Code itself.

### What This Means for Design

Design has historically served a specific economic function: risk mitigation for expensive downstream work. Software was expensive to build, so you explored and validated before committing to code. Wireframes, prototypes, usability testing — all proxies for the real thing, because the real thing cost too much to build speculatively.

When production costs collapse, this logic inverts. The bottleneck shifts from production to specification. Knowing what to produce — defining the problem precisely, understanding user needs, articulating constraints and success criteria — becomes the work that matters most.

The designer's core competency doesn't change: integration. Taking inputs from research, business, and technical constraints and synthesizing solutions that satisfy all three. But the output shifts. You're not designing a screen. You're designing the boundaries of what screens could exist. The output becomes specifications that define what a solution must do, what it must never do, and how you'll know if it worked.

The new workflow:

| Traditional | Zero-Marginal-Cost |
|-------------|-------------------|
| Research → Design → Build → Test | Define needs → Specify parameters → Generate variants → Deploy → Measure → Converge |
| 3 concepts tested as prototypes | Hundreds of combinations tested in production |
| 8-12 research participants | Real user behavior at scale |
| Months of iteration | Days or weeks |

Companies like Booking.com (25,000+ A/B tests annually), Spotify (multi-armed bandits personalizing every user's homepage), and Netflix (thousands of streaming experiments per year) have already proven that experimentation at scale drives results. They built that infrastructure over years with large engineering teams. The AI generation capability now exists to create the variants. What's emerging is the connection between the two — tools like Evolv AI, VWO, and newer entrants building toward AI-generated variants deployed and measured automatically.

### What This Product Does

This product is the specification layer. It's the tool where designers do the work that matters when generation is cheap: define the problem space precisely, set constraints and ethical boundaries, map the exploration space, establish success criteria — and then compile all of that into prompts that systematically explore the solution space through any AI generation backend.

It treats design as a search problem through a constrained possibility space. The designer defines the search space and the evaluation function. The system handles the combinatorial explosion.

The one-line version: **a structured specification document that translates design judgment into generation parameters, with research as its primary input and evaluation criteria as its most important output.**

### Why This Product Needs to Exist

Today, when designers use AI generation tools (Google Stitch, Claude, v0, Bolt, etc.), they prompt. The quality of the output depends entirely on the quality of the prompt. Most prompts are underspecified. No explicit constraints, so the model guesses. No defined exploration space, so variants are randomly different rather than systematically different. No connection to research, so generation solves a vaguely-stated problem. No evaluation criteria, so "better" is vibes. No traceability, so you can't explain why you explored what you explored.

The result: designers generate screens that look plausible but aren't grounded in anything. They're exploring a solution space they haven't defined, optimizing for criteria they haven't articulated, within constraints they haven't made explicit.

This tool makes the implicit explicit and machine-actionable.

### The Core Hypothesis

Structured context design — constraints, exploration space, research insights, evaluation criteria — produces meaningfully better design exploration than raw prompting. Better means more diverse along identifiable dimensions, more traceable to research and business needs, more reliably satisfying constraints, and more useful for making design decisions.

If this isn't true, none of the infrastructure matters. If it is true, the infrastructure scales to meet it.

### The Full Vision (Where This Goes)

The MVP is a specification workspace with a prompt compiler. The architecture is designed to grow:

1. **MVP** — Specification workspace + LLM-powered prompt compiler + swappable generation backend (Stitch MCP, Claude API). Tests the core hypothesis.

2. **Multi-provider** — Same spec compiled against multiple backends in parallel. Compare outputs side by side.

3. **Canvas interface** — Replace the structured document with an infinite canvas (React Flow) where spec sections are visual nodes. Closer to how designers think spatially. **This is the immediate priority once the MVP hypothesis is validated.** The spec model and compiler don't change — only the interface for authoring specs.

4. **Agent orchestration** — Replace single-prompt generation with coordinated agent swarms via LangGraph and Aegra (an open-source drop-in for LangGraph Platform). Specialized agents for layout, copy, accessibility critique, ethical review — working in parallel, critiquing each other's outputs.

5. **Self-hosted inference** — Run generation on own infrastructure via vLLM with Qwen models. Zero external dependency, zero per-token cost.

6. **Experimentation integration** — Connect to deployment and measurement platforms (VWO, Optimizely, LaunchDarkly). Variants go from spec → generation → production → measurement.

7. **Convergence and organizational memory** — System tracks which specifications produced winning variants, which research insights reliably predicted success, what works and why. Becomes proprietary design intelligence.

Each step adds capability without changing the spec model or compiler interface. The four abstraction layers — spec model, prompt compiler, generation provider, reference image handler — are designed from day one to make this upgrade path possible.

---

## What This Is (MVP)

A specification workspace that helps designers define the boundaries of a design exploration, then compiles that specification into variant prompts that systematically explore the defined solution space.

## What This Is Not

- Not a design tool (no canvas, no pixel manipulation)
- Not a prototyping tool (doesn't produce interactive prototypes)
- Not an experimentation platform (doesn't deploy or measure)
- Not a design system manager

It sits upstream of all of those. It's the thinking that happens before generation.

---

## Users

Designers who already use AI generation tools and want better outputs from them. Specifically:

- Product designers working on defined surfaces (checkout flows, onboarding, pricing pages, dashboards)
- Designers who work from research (they have insights, user data, or business metrics that should inform generation)
- Designers who need to explore a space, not just produce a single comp

The tool assumes a designer who can write well. The primary input is text, not visual manipulation.

---

## Core Concepts

### The Spec Model

A design specification is a structured document with the following sections. All fields are freeform text. None are checkboxes or dropdowns. The act of writing forces precision — "WCAG AA" as a checkbox is meaningless; "all form inputs need visible labels not just placeholders, error states must use both color and text, and we need to support screen readers in NVDA and VoiceOver specifically" is a paragraph that forces the designer to think through what they actually mean.

**1. Existing Design (optional)**
What exists today. Includes:
- Reference images (screenshots, photos of current state)
- Description of what's working and what's failing
- What prompted this redesign

This is optional because some work is greenfield. But most isn't. Most design work is iteration, not invention. When present, the existing design gives every generated variant a common baseline and tells the compiler what problem it's actually solving.

**2. Decision Context**
Not who the user is — what state they're in at the moment of interaction. This replaces traditional personas (which are empathy tools, not generation parameters) with something that actually parameterizes variant generation:

- **Intent** — What they're trying to figure out right now
- **Knowledge state** — What they already know vs. what's uncertain
- **Emotional register** — Anxious, confident, frustrated, bored, etc.
- **User success** — What would feel like a win from their perspective
- **Exit triggers** — What makes them bail

This produces arrival states. "The user is comparing three options and is anxious about making the wrong choice" produces meaningfully different variants than "the user is a returning customer who already knows what they want." Same page, different specification, different exploration.

**3. Need & Insight**
The "what's the WiFi really about?" layer. Cannot be generated — comes from qualitative research.

- What human need is being served?
- What behavioral insight from research frames the opportunity?
- Why do current solutions fail or fall short?

This is the most important input. It determines whether you're exploring the right space at all. The Booking.com WiFi example illustrates why: quantitative testing of "WiFi Strength - Strong" labels showed no conversion lift. Only through user interviews did researchers discover guests cared about what WiFi enabled (Netflix streaming, email), not signal strength. The winning variant was "Fast Netflix Streaming." Without this layer, you optimize the wrong thing perfectly.

**4. Business Objective**
What the business needs this to achieve. Prevents optimizing for the wrong thing.

- What outcome does the business need?
- What's the primary metric?
- What's the time horizon? (Today's conversion or next quarter's retention?)
- What are the unit economics? (A variant that lifts conversion 4% but increases returns 12% is a net loss.)

**5. Constraints**
Non-negotiable boundaries. Every generated variant must satisfy all of them. Written as prose because constraints are nuanced and context-dependent.

Types:
- **Brand** — visual identity, tone, voice rules, values
- **Accessibility** — specific requirements, device support, assistive technology considerations
- **Legal/regulatory** — disclosures, consent, jurisdiction-specific rules
- **Technical** — platform capabilities, performance budgets, framework limits
- **Content requirements** — information that must be present (pricing, terms, safety)
- **Ethical** — patterns that are explicitly prohibited

The compiler treats these as instructions that appear in every variant prompt. They're the walls of the search space.

**6. Exploration Space**
What may vary across generated variants — and the ranges. This is where the dimensionality of the problem space lives.

Dimensions that can be defined:
- Information architecture (content order, hierarchy, grouping)
- Messaging and framing (how the value proposition is articulated)
- Layout (spatial arrangement, density, whitespace)
- Interaction patterns (how users navigate, input, decide)
- Progressive disclosure (what's immediate vs. on-demand)
- Visual treatment (imagery, media, illustration approach)
- Trust signals (what credibility evidence, where, how)

For each dimension, the designer defines a range:
> "Copy must communicate X benefit, can vary in length from 10-40 words, must not use urgency framing."

And defines what must stay constant across all variants.

The tighter the ranges, the more focused the exploration. The looser, the more divergent. Learning to define these ranges well — tight enough to be useful, loose enough to discover something — is the new core competency.

**7. Evaluation Framework**
How to judge the outputs. Defined before variants exist.

- **Primary metric** — the single thing being optimized
- **Secondary metrics** — things that must not degrade
- **Guardrail metrics** — automatic stop conditions
- **Qualitative triggers** — patterns that should prompt deeper investigation
- **Confidence thresholds** — when to declare a winner
- **Time horizon** — how long to run before evaluation

This layer might matter more than the problem definition itself. Without it, you're generating random variants. With it, you have a learning system.

**8. Ethical Guardrails**
What the system must never produce. Separate from constraints because these apply at a different level — they're about manipulation, not brand compliance.

- Prohibited patterns (dark patterns, false urgency, fake scarcity, shame-based messaging, social proof manipulation)
- Vulnerable population considerations (minors, financial distress, health anxiety)
- Manipulation thresholds (where's the line between persuasion and manipulation — context-dependent)
- Consent requirements for experimentation

The speed of generation outpaces ethical review. These guardrails must be encoded in the specification before generation begins, not reviewed after.

---

### The Prompt Compiler

The compiler transforms a spec into multiple variant prompts. It uses a high-end LLM (via OpenRouter, enabling easy model swapping) to reason about the exploration space and produce variant strategies that account for dimension interactions.

This is not template substitution. The compiler is an intelligence layer. It needs to:

- Understand which dimensions interact (copy length affects layout; trust signal density affects information architecture; a 40-word headline needs different spatial treatment than a 6-word one) and produce coherent variant strategies, not random permutations.
- Interpret freeform prose and extract meaningful dimensions even when described informally.
- Produce rationales explaining why each variant is worth exploring, grounded in the spec's stated needs and research insights.
- Adapt to the spec's specificity — a loose spec with broad ranges should produce more divergent variants, a tight spec more focused variations.

**Compiler workflow:**

1. Receive the full spec as structured input.

2. Analyze the exploration space. Identify the dimensions and their defined ranges. Reason about interactions between dimensions — which variables are coupled, which are independent.

3. Produce a **dimension map** — a preview of how the requested variants will differ from each other. Each variant gets a named strategy, a rationale, and a description of what it emphasizes. (See "The Dimension Map" section below.)

4. The designer reviews and edits the dimension map. This is the point of human control.

5. Once approved, compile each variant strategy into a full generation prompt. Every prompt includes all constraints (non-negotiable), all ethical guardrails (non-negotiable), the full decision context, the need/insight, the business objective, the existing design reference when present, the evaluation criteria, and the specific variant strategy.

6. Return compiled prompts to the generation provider.

---

### The Dimension Map (Editable Preview)

After analyzing the spec but before generation, the compiler produces a dimension map. This is the designer's control surface — the point where human judgment steers the exploration before any generation resources are spent.

The dimension map shows, for each planned variant:

- **Strategy name** — a short label (e.g., "Progressive Disclosure," "Trust-Forward," "Minimal Density")
- **Primary emphasis** — which dimension(s) this variant pushes on most
- **Rationale** — why this variant is worth exploring, tied to the spec's stated needs and research insights
- **How it differs** — explicit comparison to other planned variants
- **Coupled decisions** — where the compiler has linked dimensions (e.g., "shorter headlines paired with wider layout to maintain visual balance")

The designer can:
- Rename strategies
- Edit the emphasis and rationale
- Adjust which dimensions a variant prioritizes
- Remove a variant they don't think is worth exploring
- Add a variant with a manually defined strategy
- Reorder variants
- Approve the map and proceed to generation

This is not a nice-to-have. Without it, the designer writes a spec and hopes the compiler interprets it correctly. With it, the designer and the compiler negotiate the exploration plan. The designer sees the compiler's reasoning, corrects misinterpretations, and makes strategic calls about where to spend exploration resources — all before a single variant is generated.

---

### The Generation Provider Interface

The provider interface is the abstraction that makes the generation backend swappable. The compiler produces prompts. The provider takes prompts and returns results.

**Interface contract:**

```
Input:
  - prompt: string (the compiled variant prompt)
  - images: array of image references (for existing design context)
  - options: {
      format: "html" | "react"
      model: string (optional, provider-specific)
    }

Output:
  - id: string
  - status: "complete" | "error"
  - result: string (HTML or React code — rendered in sandboxed iframes for preview)
  - metadata: {
      model: string
      tokens: number (if applicable)
      duration: number (ms)
    }
```

Generation providers return code, not images or descriptions. The workspace renders this code in sandboxed iframes for side-by-side comparison. This means the output is functional — it can be inspected, interacted with, and evaluated against the spec's constraints (accessibility, performance, content requirements) in ways that static images can't support.

**Planned providers:**

| Provider | Status | What it does |
|----------|--------|-------------|
| **Preview** | MVP | Returns the compiled prompt as text for review. No generation. |
| **Stitch MCP** | MVP target | Sends prompt to Google Stitch via MCP. Returns generated HTML/code. Free. |
| **Claude API** | Near-term | Sends prompt to Claude. Returns HTML/React. Supports vision for existing design images. |
| **OpenAI API** | Near-term | Same interface, different backend. |
| **vLLM (self-hosted)** | Later | Sends prompt to self-hosted Qwen models. Zero external dependency. |
| **Aegra/LangGraph** | Later | Orchestrates a swarm of specialized agents via Aegra. |

The spec model and compiler are provider-agnostic. Nothing about them changes when you swap providers.

---

### The Reference Image System

Existing designs enter the system as images plus text description. This handles the most common use case: "here's what we have, here's what's failing, make it better."

**How images flow through the system:**

1. Designer uploads screenshots (drag-and-drop or file picker)
2. Designer writes a description: what's working, what's failing, what prompted the redesign
3. The compiler includes both the description and (where supported) the images in every variant prompt
4. For text-only providers, only the description is included
5. For vision-capable providers (Claude, GPT-4o), images are passed directly

**Open questions on images:**
- How do we implement design context extraction from uploaded images? This will be our own capability (not native to any generation provider), likely using a vision-capable LLM with a structured extraction prompt. The extracted context (fonts, colors, layout patterns, spacing) should be surfaced to the designer for review before feeding into constraints — it should suggest, not assume.
- How do we handle multiple reference images? The same screenshot might be "the thing we're redesigning" in one spec and "a competitor reference" in another. Images attach to specs because their meaning is spec-dependent. Explicit type separation is deferred past MVP.

---

### Collaborative Input

A spec is rarely authored by one person. Different sections draw on different expertise:

- **Need & insight** — from researchers (qualitative findings, user interviews, behavioral data)
- **Business objective** — from product managers or business stakeholders
- **Constraints** — from multiple sources: brand from design leadership, technical from engineering, legal from compliance, accessibility from specialized reviewers
- **Decision context** — from researchers and designers together
- **Exploration space** — primarily from the designer, informed by everything above
- **Evaluation framework** — from designers, researchers, and product managers together
- **Ethical guardrails** — from design leadership, legal, ethics reviewers

The spec doesn't need to live in a single tool. A researcher might draft the need/insight in a research repository. A PM might define business objectives in their own system. The designer synthesizes these into the exploration space and evaluation framework. What matters is that the spec structure makes clear which sections need which expertise, so the right inputs arrive from the right people.

In the MVP, this is handled simply: a shared document that different people can contribute to. No permissions model, no role-based access. Just a structure that makes the handoff points obvious.

---

## MVP Scope

### What's in the MVP

1. The spec model as a structured workspace (all eight sections)
2. Reference image upload with description
3. The prompt compiler (LLM-powered: spec → dimension map → variant prompts)
4. The editable dimension map (preview, adjust, and approve the exploration plan before generation)
5. Preview provider (see the compiled prompts as text before sending anywhere)
6. At least one live generation provider (Stitch MCP or Claude API)
7. Side-by-side variant output view (generated code rendered in sandboxed iframes)
8. Ability to export/save a specification for reuse

### What's not in the MVP

- Canvas/node-based interface (Phase 2 — React Flow)
- Agent orchestration (Phase 3 — Aegra/LangGraph swarms)
- Self-hosted inference (Phase 3 — vLLM)
- Experimentation/deployment integration
- Spec version history or linked-spec evolution tracking
- Role-based collaborative workflows
- Design system integration
- Automated evaluation against success criteria
- Spec templates or writing guidance (deliberately excluded — templates anchor thinking, guidance patronizes; if a section is confusing, the structure is wrong and should be fixed, not papered over with hints)

---

## Evaluating the MVP

How we know if this works.

### Test Protocol

**Control condition:** Designer uses Stitch/Claude with their normal prompting approach. Generates N variants of a design for a defined problem.

**Test condition:** Designer uses the spec workspace. Fills out the specification. Reviews and edits the dimension map. Generates the same number of variants via the same provider.

### Evaluation Criteria

**Diversity:** Are the spec-driven variants more systematically different from each other? Not just randomly different — different along identifiable, nameable dimensions.

**Traceability:** Can you point to a spec input and explain why a variant has a specific characteristic?

**Constraint satisfaction:** Do spec-driven variants more reliably satisfy stated constraints? (Accessibility, brand, ethical boundaries.)

**Research connection:** Are spec-driven variants more clearly connected to the stated user need and research insight?

**Testability:** Could you write a hypothesis for each spec-driven variant? ("Variant B will outperform because it addresses the user's anxiety about commitment by leading with a guarantee.")

**Designer assessment:** Do designers feel the spec-driven variants are more useful for making design decisions?

### Minimum Success Criteria

The spec-driven approach must be:
- Noticeably better on at least 3 of the 6 evaluation criteria
- Not worse on any of them
- Worth the time investment of writing the specification (if it takes 30 minutes to write a spec and the outputs are only marginally better, it's not worth it)

---

## Architecture Decisions

### Why freeform text over structured inputs

Constraints, exploration spaces, and evaluation criteria are nuanced. Checkboxes can't capture "all interactive elements must be keyboard-navigable, contrast ratio ≥4.5:1, error states use both color and text, form inputs need visible labels not just placeholders." That's a paragraph. The act of writing forces the designer to think through what they actually mean. Precision is the product.

### Why OpenRouter for the compiler

The compiler needs a high-end LLM, but we don't want to be locked to a single provider. OpenRouter gives us a single API integration point with access to Claude, GPT-4o, Gemini, and any new models — we can swap the compiler's underlying model without changing any code. This also means we can A/B test compiler performance across models: does Claude produce better dimension maps than GPT-4o for a given spec? OpenRouter makes that experiment trivial.

### Why the compiler uses a high-end LLM

The compiler needs to reason about dimension interactions, interpret freeform prose, produce coherent variant strategies (not random permutations), generate rationales tied to the spec's stated needs, and adapt its behavior to the spec's specificity. Template substitution can't do any of this. The compiler is the intelligence layer — it's where design judgment gets translated into systematic exploration. It warrants the best model available.

### Why the compiler is a separate abstraction layer

The compiler is the core intellectual property. Keeping it separate from both the UI and the generation providers means you can change the UI (form → canvas → whatever) without touching the compiler, change the generation backend without touching the compiler, and test the compiler independently (give it a spec, check the dimension map and prompts it produces).

### Why provider abstraction from day one

We know the upgrade path: Stitch → Claude → self-hosted → agent swarms. Building the provider interface now costs almost nothing. Retrofitting it later means rewriting the integration layer.

### Why images attach to specs, not to the workspace

An image means different things in different specifications. The same screenshot of a checkout page might be "the thing we're redesigning" in one spec and "a competitor reference" in another. Meaning is spec-dependent.

### Why the dimension map is editable

The dimension map is where human judgment stays in the loop. Not by manually designing screens, but by steering the exploration strategy. The designer sees the compiler's reasoning, corrects misinterpretations, makes strategic calls about where to spend exploration resources, and approves the plan — all before a single variant is generated.

### Why no templates or writing guidance in v1

Templates anchor thinking. Guidance patronizes. The designers who use this tool can write. If a spec section consistently trips people up, the section's structure is wrong and should be redesigned — not papered over with placeholder text or tooltip hints. We'll learn what's confusing by watching people use it.

---

## Resolved Decisions

1. **Image context extraction:** Yes. We will build our own design context extraction capability — analyzing uploaded reference images to pull design DNA (fonts, colors, layout patterns, spacing) and feeding that into the constraints section automatically. This is not a feature of Stitch itself; any prior references to Stitch's `extract_design_context` were from open-source projects built on top of Stitch, not native Stitch functionality. Our implementation will need to work across providers since it's a pre-compiler concern.

2. **Reference image types:** Not for MVP. In v1, all uploaded images are treated the same — attached to the spec with a text description that explains their role. Explicit separation between baseline images and competitor/inspiration references is worth revisiting later but adds complexity without testing the core hypothesis.

3. **Compiler model selection:** Use OpenRouter. This gives us a single API integration with the ability to swap models in and out easily — test the compiler against Claude, GPT-4o, Gemini, or any new model without changing the integration layer. The compiler model and the generation provider model can (and probably should) be different. OpenRouter is the compiler's provider; the generation provider interface handles the downstream generation separately.

4. **Spec evolution tracking:** Not for MVP. In v1, specs are saved and can be manually versioned (export/save as new). Linked-spec evolution (tracking what learning from Spec v1 informed Spec v2) is a future capability once we understand how designers actually iterate on specs in practice.

5. **Cold start:** The spec structure handles this naturally. All sections accept any level of detail, from a single sentence to multiple paragraphs. A greenfield spec with sparse sections produces looser, more divergent exploration. A mature spec with dense research and tight constraints produces focused optimization. The tool doesn't need separate modes — the spec's density *is* the mode. The compiler adapts its strategy to whatever it receives.

---

## Open Questions (Remaining)

1. **Design context extraction implementation:** How do we build the image analysis for extracting design DNA? Options include using a vision-capable LLM (Claude, GPT-4o) with a structured extraction prompt, or a dedicated design analysis pipeline. The extracted context needs to be reviewable by the designer before it feeds into constraints — it should suggest, not assume.

2. **Variant output rendering:** Generated variants will be code (HTML, React, or similar) returned from the generation provider. This code needs to render in the workspace for side-by-side comparison — likely in iframes or a sandboxed rendering environment. Need to determine: how to handle cross-provider differences in output format, how to ensure consistent rendering, and how to handle variants that include JavaScript or dynamic behavior.
