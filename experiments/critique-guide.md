# Critique guide

Persistent heuristics the agent uses when critiquing experiment runs. Edited by hand or via periodic consolidation passes (agent reads accumulated `feedback.md` files, proposes updates here, human approves).

**This is the calibration artifact.** It's how conversational judgment becomes durable across sessions. Keep it short — long enough to shift outputs, short enough that an agent can hold it all in working context while critiquing.

**Pair with [`iteration-log.md`](iteration-log.md)**: this file holds judgment heuristics; the iteration log holds the chronological narrative of prompt-edit cycles, what was changed, why, the run that tested it, and what's still open. A future-session agent should read both — critique-guide for *how to judge*, iteration-log for *where we are*.

---

## Calibration run defaults

When running canonical or reframe-upstream for prompt-behavior calibration (the runs whose outputs feed this guide via the critique loop):

- **Default `--count 5`** for hypothesis production. Two hypotheses is a structural minimum — enough to test whether contrast happens, not enough to evaluate *what the prompts tend to produce*. Five gives genuine breadth: distribution of scopes, range of craft, variance in how `measurements` are written, whether the model converges on a few patterns or spans the exploration map. Override only with a specific reason (cost gating, or a bug-fix verification where two contrasting cases is enough).
- **Pre-supply spec sections** when iterating on stages 2–4 prompts so the input is held constant across runs (otherwise stage-1 noise pollutes the comparison).
- **Use `--no-evaluate`** when the focus is hypothesis quality + build quality; add eval back when the focus is rubric behavior. Builds dominate cost; eval adds ~20% on top.
- **Raise `--cap-tokens`** for `--count 5` runs: the default 200k per-run cap is sized for small runs and will trip mid-pipeline at five builds. `--cap-tokens 1000000` is a reasonable headroom; the daily ledger still gates total spend.

Inputs-gen runs ignore `--count` (they don't run the incubator); these defaults are canonical and reframe-upstream specific.

## How to read a run

When critiquing a run, in order:

1. Read `summary.md` end-to-end. Note the flow, brief, models, and any auto-observations the tool already flagged.
2. Read `hypotheses.json` and the `hypothesis`/`rationale`/`measurements` prose for each.
3. Open at least one `artifacts/<hyp-id>/index.html` to see what was actually shipped.
4. Read the matching `evals/<hyp-id>.json` for rubric scores and findings.
5. Spot-check transcripts when something looks off — especially the incubator transcript when hypotheses feel weak, or the build transcript when artifacts feel underweight.

Walk the primary user journey through the bet-critical features before writing the critique. Don't just open `index.html` — actually click through. If the hypothesis says "shows last visited memory after finalize," write a memory, finalize it, return home, look. If the hypothesis says "phase-aware content based on weeks-since-loss," change the input, see if content changes. **Read the underlying JS** to confirm state management exists where the bet implies it should. Pages that look polished individually can hide a broken cross-page user journey because of missing state model — and the bet-critical features only matter when their primary journey works end-to-end.

**Run the scope-vs-believability check on every hypothesis.** Three questions in order — stop at the first one that fails: (1) **Spread thin?** Did the artifact try to ship every named feature with substantive UI and end up shallow everywhere, with no individual feature deep enough to exercise the bet? (2) **Off-target slice?** Did the artifact concentrate effort on surfaces that don't contain the bet-critical work — over-building scaffolding while the hypothesis-named bet-critical features are thin? (3) **Hollow at the bet?** Inside the bet-critical surfaces, is the bet-critical loop faked or admitted-and-shipped — `// in a real app...` / `// simulate...` / hardcoded stand-ins / fake-progress UI in place of a real interaction? Read the JS for the bet-critical path before scoring. See "Scope-vs-believability for application-scale hypotheses" under Artifact / build quality below for diagnostics on each failure mode.

Write the critique into `runs/<id>/critique.md`. Keep per-rubric notes short and structurally specific (point to the exact prose or page that's the problem). End with one or two suggested next experiments.

**Always end every critique with a "Where I'm uncertain about my own judgment" section listing exactly three calibration questions** — the specific calls in the critique where reasonable people could disagree, where my instinct could plausibly be wrong, where a correction from feedback would meaningfully shift my heuristics. Three is the working budget: enough to cover the non-trivial uncertainties, few enough that the human can actually weed through them. These are the highest-signal lines for calibration; if my critique has zero uncertainties, I'm probably overconfident — surface what's softest about my own judgment instead of papering over it.

**The human gives feedback inline in chat, not by editing `feedback.md`.** When the human responds to a critique with corrections, additions, or "what you missed" observations, capture the substance into `runs/<id>/feedback.md` myself. The file is the durable record across sessions; the human's job is to give the feedback, the agent's job is to write it down so it survives. Never ask the human to edit feedback.md directly — that's friction. When patterns stabilize across multiple runs' feedback files, do a consolidation pass and propose edits to this guide; the human approves inline.

## Before reaching for a prompt edit (runtime self-instruction)

When critique reveals a gap or the human flags an issue, **before** drafting another prompt edit, ask: *is this question about prompt content, or about flow shape?* The experiments tool was built so flow shape is also editable. Available levers besides prompt edits:

- **New flow files** in `experiments/src/flows/` — add a TypeScript file, compose stages differently. Cheap.
- **New stages within a flow** — insert an LLM call between existing stages whose output stitches into `<specification>` as a new prose block. The spec block is a universal prose carrier; new stages whose output is text are essentially free (no schema change, no UI work).
- **Reordering stages** — the canonical sequence (inputs-gen → incubator → build → eval) is not sacred.
- **New skills** in `packages/auto-designer-pi/skills/` — `SKILL.md` files attach to Pi design sessions. Add or remove behavioral guidance at this layer instead of the prompt.
- **Different output structure** from any stage — the incubator outputs JSON; we could have it output a richer or simpler structure. The build stage emits files; we could have it emit a build plan.
- **Run-directory contents** — what gets written for the human to inspect (we did this once for `preview.html`).
- **Parallelism** — multiple agents running in parallel with different framing, results aggregated.

If the same question has been hit with prompt edits twice without resolving it, that's a strong signal a flow-level change is the right tool. Don't keep editing prompts in cycles 5-6-7-8 when the architectural answer was a new flow file in cycle 5.

## End-of-cycle checklist (runtime self-instruction)

**Run through this after every iteration cycle. Don't skip steps; check each off in the chat reply so the human can see the loop closed.** This is durable behavior that should survive across sessions — a future-session me reads this and runs through it the same way.

1. **Critique written?** `runs/<id>/critique.md` exists, structured by run-level findings + per-hypothesis observations + cross-cutting notes.
2. **Three calibration questions at the end?** The "Where I'm uncertain about my own judgment" section lists exactly three uncertainties — the points in the critique where reasonable people could disagree, where my instinct could plausibly be wrong, where a feedback correction would meaningfully shift my heuristics. Three is the working budget; not zero, not five.
3. **Human chat feedback captured into `runs/<id>/feedback.md`?** If the human responded to my critique inline in chat with corrections, additions, or "what you missed" — I've written that into the file. Don't rely on chat memory; chat dies.
4. **Iteration log updated?** `experiments/iteration-log.md` has a new cycle entry (or the open cycle entry is filled in) with: files edited, why, snapshot reference, run id link, headline outcome, what's still open. The log is the chronological narrative that survives across sessions.
5. **If prompts were edited this cycle, did I `pnpm snap` before AND after?** Before: captures the baseline tied to whatever run preceded the edit. After: captures the new state tied to whatever run will follow.
6. **Have I presented the human with clickable markdown links to all the files they'd want to inspect?** This is the surface they reach into to evaluate the cycle. Always include:
   - The run's `summary.md` (headline + inlined outputs)
   - The run's `preview.html` (browser-openable hypothesis gallery — the human's primary entry point for testing artifacts)
   - The run's `critique.md` (my analysis with three calibration questions)
   - `experiments/iteration-log.md` (cycle narrative)
   - Each hypothesis's `artifacts/<id>/index.html` (so the human can click to load and test individual designs)
   - Any new briefs, input files, or other artifacts created during the cycle
   - If `feedback.md` was updated, link it
   
   Format: markdown links so they're clickable in the human's editor. Don't expect the human to navigate the runs/ directory tree by hand — surface every relevant file path inline.

**If any step is skipped, the cycle isn't really closed.** A future-session agent picking up cold should be able to read the chat reply at end of cycle and reconstruct what was done from the file links alone.

---

## Calibration heuristics (seeded from prior conversations)

These are the principles we've established that should shape critique. Update with corrections from `feedback.md` over time.

### Scope

- **Scope must be inferred from the brief, not forced into a fixed taxonomy.** If a critique reads as "this should have been a flow / a feature / an app", check whether the brief actually implied that — and whether the language used to characterize it is open-ended (a flow, a cluster, *something that doesn't fit those examples*) or pigeonhole-shaped.
- **Scope must travel through hypothesis prose, not metadata.** Each `hypothesis` field should make the slice it tests legible to a designer. If you can't read a hypothesis and infer "this is testing a single decisive screen" or "this is testing a 3-step flow," flag it.
- **Scope contradiction is a hard signal.** If `measurements` describe checks that imply a different scope than the `hypothesis` prose claims (e.g. measurements demand multi-step flow inspection while the hypothesis bets on a single screen), score `hypothesis_adherence` and `expresses_bet` down.

### Hypothesis quality

- A hypothesis is a *committed answer*, not an HMW question. It should read as "we'll build X to produce Y, testing it via Z" — closed, falsifiable, scoped.
- **Each hypothesis should read as an MVP probe** — the smallest credible artifact slice that makes the bet falsifiable from expert inspection. A hypothesis whose `measurements` would require a full product build to verify is over-scoped; one that pretends the whole product fits in a single flat page is under-scoped.
- **Watch for posture-not-features even when hypotheses look polished.** A hypothesis that describes a direction ("subtle non-intrusive presence", "feels like a quiet refuge", "respects the user as someone grieving") without naming the specific UI elements/affordances/flows that must exist is unbuildable in any reproducible way. The build agent will invent the features, and the artifact's relationship to the bet becomes fuzzy. If you cannot list 3-5 concrete things the artifact must contain after reading the hypothesis prose alone, flag it. This is a critic-time red flag even when the prompt is supposed to prevent it — prompt drift happens, and the prompt isn't the only line of defense.
- The hypothesis + rationale + measurements triplet should make the bet recognizable from prose alone (no need to read the artifact to know what was being tested).
- Generic UX advice ("progressive disclosure", "use cards") is a 2 on originality. Brief-specific reasoning is a 3-4. Distinctive insight is 4-5.

### Measurements

- Measurements must be **design-inspectable** — judgeable yes/partial/no on the static mock alone. Anything requiring analytics, conversion rates, surveys, or live user data is a fail.
- Each measurement should tie to *this* bet, not generic UX hygiene. "Page is accessible" applies to any UI; "the urgency signal sits above the fold without competing labels" ties to a specific bet.

### Artifact / build quality

- Artifact breadth must match the scope the hypothesis names. A flow-shaped bet shipped as a single shallow page caps `hypothesis_adherence` at 2. Same for a single-screen bet padded into multi-page sprawl.
- **Scope-vs-believability for application-scale hypotheses.** When a hypothesis points at something that would be a multi-feature product (a workspace, a destination app, a manager-and-report tool), the artifact cannot ship the entire surface — there isn't budget. The right shape is: pick a tight subset of surfaces, make sure the picked subset is *where the bet lives*, and inside that subset implement the bet-critical loop honestly. Three failure modes to look for, in order:

  1. **Spread thin** — the artifact tries to ship every named feature with substantive UI. Token budget gets divided, every page is shallow, no individual feature has the depth needed to actually exercise the bet. *Diagnostic*: every feature exists at surface level; nothing inside any feature actually works end-to-end.
  2. **Off-target slice** — the artifact concentrates effort, but on surfaces that don't contain the bet-critical work. The hypothesis names the bet-critical features explicitly; the agent can still under-invest in those and over-invest in scaffolding (polished onboarding, settings, navigation chrome). *Diagnostic*: the bet-critical features the hypothesis named are present but thin, while non-bet-critical surfaces are over-built.
  3. **Hollow at the bet** — the artifact picks the right slice and the right surfaces, but the *bet-critical loop inside the picked surfaces* is faked. The hypothesis's central claim depends on a step (audio playback, persistence, conversion, derived state) that the agent admits in a code comment is missing and ships a placeholder for. *Diagnostic*: read the JS for the bet-critical path; look for `// in a real app...`, `// simulate...`, `// would...`, hardcoded stand-ins where the bet implies real data, or fake-progress UI in place of a real interaction. Voice-First Reflection in [`runs/20260510-122718-wild-ideation-4593`](runs/20260510-122718-wild-ideation-4593/) is the canonical example: recorder works, listen queue renders from storage, but `simulatePlayback` runs a setInterval-driven progress bar instead of actually playing the recorded audio — the bet ("voice as primary modality") is unfalsifiable because no voice ever plays.

  The right shape passes all three: tight subset, on-target slice, real bet-critical loop inside it. When critiquing, walk the three checks in order — each rules out a distinct failure mode and you stop at the first one that fails. Scaffold around the bet-critical surfaces is expected and fine; the failure modes only apply to the bet-critical work itself.

  Build-side prevention is in [`packages/auto-designer-pi/prompts/design-agent-instructions.md`](../packages/auto-designer-pi/prompts/design-agent-instructions.md) under the bet-critical-features bullets — the prompt explicitly forbids `// in a real app...` / `// simulate...` comments in bet-critical paths and requires a self-search for those strings before declaring done. Critique-time inspection is the second line of defense.
- **Working depth means end-to-end, not UI-only.** A bet-critical feature that promises persistence ("shows last visited memory", "saved entries appear on home") must actually persist data and read it back across pages. Common fail mode: the agent ships polished individual pages where each *looks* like the feature works, but the user-journey across pages (write → finalize → return home → see what you wrote) is broken because there's no shared state model. The static-mock format tempts the agent toward UI-only implementation. Concrete checks: read the JS — if there's no `localStorage.getItem`, no `loadMemories()`, no shared state model where the bet implies one should exist, the bet-critical features are thin even if pages look polished. Hardcoded "stub content" dressed up as if dynamic (e.g. a hardcoded "last memory" card in HTML) is a clear violation of working depth. If the hypothesis's bet-critical claim depends on a cross-page data flow, that data flow must be implemented; bottoming out at "in a real app, this would persist" comments means the agent admitted-and-shipped a bet-critical thinness.
- Generic AI design patterns (purple gradients, stock hero layouts, Inter-only typography, "lorem ipsum" placeholder content) are a 2 on originality, not a 3.
- Real, plausible content (names, dates, copy) reinforces the bet. Lorem ipsum or "Sample User" copy is a craft failure even when layout is competent.

### Evaluator behavior

- When evaluators give 3 across the board, treat as "competent baseline / nothing distinctive." Don't read it as "good run" — read it as "this run didn't earn a higher score on any axis."
- Hard fails are hard fails. Don't soften them in the critique.
- **No rubric numerals when the evaluator didn't run.** `--no-evaluate` runs produce no rubric scores. Critiques on those runs must judge in plain prose ("the bet is unfalsifiable from the artifact alone", "the bet-critical loop is faked") — do not fabricate `hypothesis_adherence: 2 / working_depth: 2`-style scoring as if a rubric had been applied. The numerals are the auto-evaluator's vocabulary, not the working vocabulary the human uses to read critiques. Reserve them for runs where `evals/<id>.json` actually exists.

### Curation pick-stability (the `ideation` flow)

The `ideation` flow's Stage 0b curation is a spread-*sampler*, not a spread-*selector*. The model is explicitly instructed to maximize spread across **digital products** (cycle 26 added the product-shape filter; cycle 27 added the hypothesis-stage switch-reason check) — not to pick the canonical-best 5; this produces run-to-run pick variance by design. Cycle 18 measured this on the grief brief across 5 runs (cycles 11, 15, plus 3 fresh): 25 unique picks, zero exact-name match across any pair, but a clear two-tier territory pattern — a stable backbone of 3-5 territories that recurs in 60-100% of runs (ambient, pre-loss, archive on grief), and a long tail of ~8-10 territories sampled 1-2 per run (anonymous, somatic, anti-design, browser-extension, etc).

How to read curation outputs in critique:

- **Don't flag pick-divergence between runs as a defect.** Different runs producing different picks is the spec, not a regression. Pick variance is the cost of asking the model to maximize spread instead of converge.
- **Use the stable-backbone territories as a ground-truth signal.** Picks that recur in 4-5/5 runs are unambiguously the territories the brief most strongly invites — useful as an anchor for evaluating whether a single-run corpus covers the obvious bets.
- **Read each run's long-tail picks as that run's distinctive contribution.** A run that picked "anti-design text stream" or "somatic anchor" is exploring a corner the typical run doesn't reach; that's signal, not noise.
- **Repeated runs compound coverage of the imagination space.** If a critique question is "what could this brief be?" rather than "what should this brief commit to?", multiple ideation runs are the answer; a single run covers ~5 territories, three runs cover ~12-13.
- **The incubator renames everything downstream of curation.** Each run's `hypotheses.json` reflects the incubator's framing of the curated picks, not the picks themselves. To see what curation actually picked, read the `02-curation.md` transcript's `## Spread rationale` section (two paragraphs since cycle 26: paragraph 1 is the spread justification across digital-product kinds, paragraph 2 is the audit trail naming transformations and set-asides) and the `## <name>` headers above it.

### Brief shape changes what the corpus tests

Cycle 19 ran the same `ideation` flow across 5 different briefs covering scope, sparseness, gravity, and prescription axes. Different briefs surface different system behaviors, so the same critique heuristics read differently depending on brief category:

- **Sparse briefs (1-2 sentences) liberate the brainstorm.** With minimal grounding, the model pushes hard into metaphor and unconventional product types. tax-prep produced "Tax Escape Room", "Parallel Universe Explorer", "Business Autopsy Table" from two sentences. Read sparse-brief corpora for *imagination breadth*, not feature-fidelity.
- **Detailed briefs (multiple paragraphs with specific signals) ground the corpus in real signals at the cost of imagination space.** icu-handoff's picks ("30-Second Canvas", "Trend Whisper", "Family Pulse") engaged with the brief's pacing/data-overload/family-context signals but stayed within recognizable product shapes. Read detailed-brief corpora for *signal engagement* — does each pick map back to something specific in the brief, or are they generic?
- **Cross-cutting briefs (explicitly invite non-app shapes) get non-app shapes.** code-onboarding's "Don't constrain to the form factor of a destination web app" produced a Slack Bot and a VR landscape among the picks. Briefs that don't explicitly invite cross-cutting shapes default to web-app destinations.
- **Prescribed-solution briefs (feature lists, named comparables) are a real gravity test.** habit-tracker explicitly listed streaks, reminders, charts, social, premium tier, and named Streaks/Habitica/Way of Life. Cycle 19 confirmed: `ideation` ignored the prescription and produced categorical alternatives (Garden of Habits, Quantum State, Wearables); `reframe-upstream` (canonical-after-reframe, no wild brainstorm) produced exactly the prescribed feature list. The wild brainstorm + spread-curation is what breaks prescription-grip; reframe-alone is too weak.

When critiquing, ask: *what category is this brief, and does the corpus do what that category should produce?* A sparse-brief corpus that's faithful to specific user signals isn't doing its job; a detailed-brief corpus that's wildly metaphorical isn't either.

### Hand-waving in permission-gated functionality

The cycle-14 prompt rule (no `// in a real app...` / `// simulate...` in bet-critical paths) held cleanly across cycles 15+18 (grief, 0 hits in 20 builds) but weakened across cycle 19's diverse-brief matrix (13 hits in 4 corpora, 20 builds). All hits clustered around **browser-permission-gated or backend-required functionality** — WebAuthn, MediaRecorder, microphone permissions, geolocation, sensor APIs, real backend services. The cycle-14 rule named specific anti-patterns (Blob → base64, audio playback) but didn't generalize to "any browser-permission-gated feature is the same problem."

How to read this in critique:

- **The hand-waving grep is a brief-domain-sensitive signal.** Zero hits on grief-style text-only briefs is meaningful; zero hits on a brief that invites biometric/voice/sensor features would be more meaningful but is harder to achieve. Use the rule as a strong floor on text-only briefs and a softer signal on permission-heavy briefs.
- **Self-invented permission-gated features are the most common failure.** habit-tracker's brief didn't ask for biometric — the model invented "Wearable Body Sync" then shipped `// Simulate biometric sync (for demo)`. The model isn't being forced into hand-waving by the brief; it's choosing simulation when its own invented features need permissions. The rule says descope or implement, not stub. The rule is being violated, not "just hard to follow."
- **Some `// Simulate ...` is appropriate scaffold demo data.** icu-handoff's "Simulate minor vital changes for demonstration" generates the demo content the bet-critical "show trends well" feature needs to display. Distinguish *bet-critical loop simulation* (where the bet is unfalsifiable from a stub) from *scaffold demo-data simulation* (where the bet is "we present this data well" and the data needs to come from somewhere).

### Source-of-section matters

When critiquing an inputs-gen run (or a canonical run with mixed sources), check `transcripts/` for `*-source.md` files first:

- Sections from `*-source.md` came from the **user**. Their quality reflects on the user's writing, not on `gen-*.md` prompt quality. Don't ding the prompt for a strong user-supplied section that you didn't pay attention to was user-supplied.
- Sections without a `*-source.md` (i.e., a normal `NN-inputs-<section>.md` transcript) came from the **prompt**. Critique those.
- For regen-with-draft runs, the prompt transcript's `<current_input_draft>` block shows what the user provided as a starting point — compare that to the response to evaluate whether the prompt's revisions improved or degraded the draft.

---

## Open observations

Add notes here when patterns emerge across multiple runs that aren't yet codified above. Move into the calibration heuristics once they stabilize.

(Empty — populate as we run experiments.)
