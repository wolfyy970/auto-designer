---
name: Design constraints
description: Use when authoring or critiquing a constraints document that supports a design brief — the non-negotiable boundaries that filter strategic viability. Covers (1) how to write — what filters strategic viability vs what governs prototype rendering (the keel of this skill), what goes in this document vs the sibling supporting docs, sources to draw on. (2) How to evaluate — an 11-criterion rubric run on every constraints doc before it ships. Forcing function: author + evaluate is one workflow, not two; no silent author-and-ship.
tags:
  - design
  - constraints
  - strategic-filter
when: auto
---

# Design constraints

This skill is the source of truth for what a constraints document carries, what it does not carry, and how to know whether the doc you've just written is doing its job. It exists because constraints documents are the most-drifted document in design-brief packages: rendering-layer rules (sizing, contrast, motion, copy patterns) get smuggled in as if they filter the exploration space when they actually govern only how a chosen direction is rendered. That drift narrows exploration for the wrong reason and leaves real strategic deal-breakers under-named.

## The document family

A design brief is typically accompanied by three supporting documents. Each does one job, and content leaking between them produces a mixed signal downstream readers reason against badly.

| Document | What it carries | Job |
|---|---|---|
| Design Brief | The directive. Problem statement only — user, situation, stakes. Solution-open. | Frame the problem. |
| Research Context | What user research has revealed. Real signals about audience, behavior, landscape. | Back the framing with evidence. |
| Design Evaluation Criteria | Design properties any viable solution must exhibit; failure-modes-of-overpursuit. | Define what good looks like at the design level. |
| **Design Constraints** | **Non-negotiable boundaries that filter strategic viability — what makes some directions non-viable regardless of design quality.** | **Hold the bet inside reality.** |

The sibling skills `design-brief`, `design-research`, and `design-evaluation` are calibrated to keep their documents honest. This skill is the one for the constraints document.

## The keel — strategic vs execution

This is the calibration that fixes the most common drift in this document, and the one the rubric tests for first.

Any design effort has two layers of concern. The **strategic layer** (this skill's territory) describes the *exploration space* — what filters which directions are worth pursuing. The **execution layer** — where design systems, accessibility implementation, component-level guidelines, and build-quality evaluation live — governs *how a chosen direction is rendered well*.

Operational test: *Would removing this concern change which directions are worth pursuing?* If yes → strategic, belongs in this document. If no → execution, belongs in the design-system / accessibility-implementation / build-quality work, wherever your team tracks those.

When a concern feels like it could go either way, apply the test twice — once at the layer of "what kind of product is this" (strategic) and once at the layer of "how is this drawn on screen" (execution). The concern usually belongs to the layer where its absence would change the decision.

A single framework can have both a strategic application and an execution application. The strategic application — when the framework *filters the exploration space* — belongs here. The execution application — when the framework *prescribes a rendering pattern* — belongs in execution-layer work. The rubric tests for this.

---

# Part 1: How to write

## 1.1 Purpose

A constraints document names what makes some directions non-viable in market regardless of how well they're designed. A direction that violates a hard constraint cannot be saved by good design execution; the constraint filters it out before further design effort goes into it.

A constraints doc is doing its job when a reader can finish it and feel like they could spot a non-viable direction on first inspection — recognize the directions that the audience, the regulatory environment, the operational reality, or the data landscape will not let survive.

## 1.2 What goes in

**Open the doc with the surface declaration.** The first sentence states the target surface(s): a specific surface, a surface mix, or an explicit `open` marker when surface choice is itself part of what hypotheses should propose. A constraints doc without an explicit opening surface declaration is incomplete regardless of how well the rest is written.

Each category below is described by what it is and the test it must pass. The skill does not enumerate specific instances — the author identifies the specific frameworks, surfaces, and audience realities that apply to the brief at hand.

- **Regulatory frameworks that constitute hard deal-breakers** for the brief's audience and use case. The test: would a direction that violates this framework be non-viable regardless of design quality? When yes, the framework belongs here. The author identifies the specific frameworks the brief implies; the skill does not enumerate them, because enumeration anchors downstream readers to force-fit those specific frameworks even where they don't apply.
- **Target surface(s) declaration.** Specific surface(s) the experience must inhabit (mobile-native, mobile-web, responsive-web, desktop-web, tablet, voice, SMS, kiosk, watch, hybrid), or an open marker when surface choice is itself part of what directions should propose.
- **Audience reach realities.** Characteristics of the population that constrain which channels, modalities, or experiences can reach the target users. Phrased as filters on the exploration space, not as execution-layer accessibility rendering rules.
- **Cognitive, institutional, and operational realities at the *what's-viable* level.** Conditions about the user's state (stress, scarcity, vulnerability), the institution's capacity, the time-budget the user actually has, or the data and relationships that do or do not exist. These filter which direction shapes can survive contact with reality. They belong here when their absence would change which directions are worth pursuing.
- **Hard data and access realities.** When the data a class of direction would need doesn't exist, when the institutional access doesn't exist, or when the user-side context makes a class of approach impossible.

## 1.3 What does NOT go in

Each item below has a destination — name it explicitly when redirecting content. The destinations are described categorically; the specific files or teams that own each will vary by organization.

- **Specific accessibility-rendering criteria** (contrast ratios, ARIA patterns, focus management, keyboard navigation rules) → accessibility implementation guidance and build-stage evaluation rubrics. These govern how a chosen direction renders accessibly; they do not filter which directions are worth pursuing.
- **Component sizing, primary-action positioning, spacing rhythms** → component-level design guidelines and design-quality rubrics.
- **Typography, color tokens, motion, visual hierarchy** → design system specification and visual design guidelines.
- **Component-level state-completeness, journey integrity, real persistence** → build-quality / interaction-design guidelines.
- **Copy-pattern specifics** (label conventions, plain-language rules for prototype text) → component-level design guidelines.
- **Rendering-level response-time guidance** → build-quality guidelines.
- **The cognitive ledger applied at the component level.** Any cognitive-law translation that prescribes a specific UI pattern (group size, alignment rule, target sizing, salience hierarchy) belongs in component-level design guidelines. The cognitive frameworks themselves can appear here as *filters on viability*, but their *component-level applications* belong in execution-layer work.

## 1.4 The strategic-cognitive line, stated as a test

The same cognitive framework can appear in two different places at two different levels of application:

- It belongs in this document when its presence in the user's state *filters the exploration space* — when it tells the reader *this kind of direction will not survive contact with this user*.
- It belongs in execution-layer work when it *prescribes a rendering pattern* — when it tells the renderer *draw the screen this specific way*.

The skill makes the line explicit. Where cognitive ledgers exist in an organization, they often mix the two levels; re-homing by layer is the cleanup pattern, and meanwhile this skill names the boundary so each new constraints doc applies it consistently.

## 1.5 The accessibility-as-audience-reach pattern

The single most common drift in constraints docs is "WCAG 2.2 AA is a floor" or equivalent rendering-criterion framing. The rubric catches this; the skill body has not given authors a positive template for the same concern, so the floor sentence keeps getting written.

The positive template: when the audience-reach concern is real, name it as a filter on the exploration space, not a floor for how the prototype renders.

- **Floor framing (anti-pattern):** prescribing how the prototype must be rendered ("must work with screen readers, keyboard-only navigation, reduced-motion preferences, non-default text sizes"). This is rendering guidance; it lives in accessibility implementation work, not in constraints.
- **Audience-reach framing (the pattern that passes):** name the audience composition where the concern actually filters viability, and phrase the constraint as: *directions that fail to reach this audience composition are not viable*. The hypothesis space narrows; the rendering specifics live where they belong.

When you find yourself writing about accessibility, the test is: would removing this line change which directions are worth pursuing? If the line is about how the screen is drawn, the answer is no — it belongs in execution work. If the line is about which audience can be reached at all, the answer is yes — and that's the strategic version that belongs here.

## 1.6 The shape that works

- One short paragraph per category of concern (regulatory, target surface, audience reach, cognitive/institutional/operational reality, data/access reality)
- Each paragraph passes the operational test in the keel independently
- 4–6 paragraphs total
- The exploration space is named explicitly where it exists — what the brief allows directions to vary on

When using existing constraints docs as exemplars to calibrate voice and grain, score them against the rubric in Part 2 yourself rather than copying their content forward — even well-shaped strategic docs often contain rendering-layer drift the rubric exists to catch.

## 1.7 Sources to draw on

The canon for *what filters strategic viability* — named by author/work, not by enumerated specifics:

| Source | What it gives you |
|---|---|
| The body of national regulatory frameworks covering health information, consumer credit, debt collection, education records, civil rights, and disability | The body of frameworks the author identifies the specific applicable ones from. The skill does not enumerate to avoid anchoring. |
| Marty Cagan — the four risks (value, usability, feasibility, viability) | The viability and feasibility lenses identify what filters exploration-space at the strategic level. |
| GDS Service Manual / 18F Methods | Surface and channel decisions; public-service rigor on which surfaces actually reach which audiences. |
| AHRQ / CDC / NN/g audience profiles | Used here as filters at the strategic-reach level, not as execution-layer accessibility prescriptions. |
| Established cognitive frameworks — Yerkes-Dodson, Cognitive Load Theory, Hick's Law, working-memory findings | Applied here at the *what-direction-is-viable* level, not the rendering level. |

For per-domain authoritative source identification (which body to cite when grounding healthcare claims vs civic claims vs financial claims), the sibling `design-brief` skill maintains a source map.

## 1.8 Realism standards

The same realism rules as the sibling skills (`design-brief`, `design-research`, `design-evaluation`):

1. Every empirical claim is sourced.
2. No invented statistics.
3. Mark inferences explicitly with `(Inferred)`.
4. Domain expertise is checked — regulated domains have actual frameworks; do not invent them.
5. Source-quality hierarchy applied: government agencies → peer-reviewed work → established non-profits → industry research → design org case studies → practitioner blogs.

## 1.9 Cross-references — where execution-layer concerns route to

These categories of execution-layer work exist in any design organization, though the specific files or teams that own them will vary. The point of the table is the *routing logic*: these concerns are not what filters which directions are worth pursuing, so they don't belong in a constraints document.

| Concern | Generally lives in |
|---|---|
| Specific accessibility-rendering criteria (contrast ratios, ARIA patterns, focus management, keyboard navigation) | Accessibility implementation guidance; build-stage evaluation rubrics |
| Typography scale, color tokens, spacing rhythm | Design system specification |
| Touch targets, primary-action discoverability, component hierarchy | Component-level design guidelines; design-quality rubrics |
| Motion, atmosphere, distinctive aesthetics | Design system / visual design guidelines |
| Cross-page state, journey integrity, real persistence | Build-quality / interaction-design guidelines |
| Build-quality evaluation (artifact-level scoring) | Build-stage evaluation rubrics |
| Cognitive principles applied at the component level (specific UI patterns) | Component-level design guidelines |

---

# Part 2: How to evaluate

**You don't ship a constraints doc without scoring it.** Every constraints doc authored under this skill goes through the rubric before it's used downstream. This is the forcing function.

## 2.1 The author + evaluate workflow

1. **Draft** the constraints doc using the shape and standards in Part 1.
2. **Evaluate** it against the 11-criterion rubric below, *inline in your output*. Score each criterion Pass / Partial / Fail. Name the specific weakness for any Partial or Fail.
3. **Decide.** If the rubric shows ≥ 9 Pass with 0 Fail, the doc is ready. Otherwise, rewrite and re-score.
4. **Surface the score to the human** — visible alongside the doc.

## 2.2 The 11-criterion rubric

| # | Criterion | What Pass looks like | What Fail looks like |
|---|---|---|---|
| 1 | **Strategic-vs-execution test passes** | Every constraint passes the operational test in the keel. | Rendering-layer guidance (sizing, contrast, motion, copy patterns) appears as if it filters the exploration space. |
| 2 | **Applicable regulatory frameworks named** | The author has identified the specific frameworks that constitute deal-breakers for the brief's audience and use case. | Generic "regulatory compliance" language with no actual framework identification, OR force-fit frameworks pulled from a generic list that don't apply to this brief. |
| 3 | **Target surface(s) declared** | Specific surface(s), surface mix, or an explicit `open` marker. | No surface declaration; or implicit/inferred surface without explicit statement. |
| 4 | **Audience reach realities named where they filter viability** | Audience characteristics that constrain reach — phrased as exploration-space filters. | Execution-layer accessibility criteria (contrast ratios, ARIA, keyboard nav rules) framed as audience-reach constraints. |
| 5 | **Cognitive / institutional / operational realities at the strategic level** | Phrased as filters on the exploration space. | Phrased as rendering rules for the prototype. |
| 6 | **Hard data and access realities surfaced where applicable** | Named when the data a class of direction needs doesn't exist, when institutional access doesn't exist, or when user-side context blocks a class of approach. | Silent on data/access realities when the brief's domain has obvious gaps. |
| 7 | **No execution-layer guidance** | None of the categories in the cross-reference table appears in the body. | Typography, color, motion, contrast, sizing, copy-pattern specifics, response-time targets in the rendering sense. |
| 8 | **No success criteria** | Design properties for evaluation and their failure-modes-of-overpursuit are absent. | "The design must achieve X" or "The success criterion is Y" appears (those belong in `design-evaluation`). |
| 9 | **No research findings beyond what's needed to make a constraint relevant** | Research findings appear only where they ground a constraint's relevance. | Broad audience-research narrative duplicating content from the research doc. |
| 10 | **Length appropriate** | 4–6 short paragraphs. | More than ~7 paragraphs, or duplicating content from other companion docs. |
| 11 | **Empirical claims sourced or marked Inferred** | Sourced claims have citations; extensions from sourced findings are marked `(Inferred)`; qualitative magnitude language used where no source is available. | Statistics without citation; framework-translated specifics (e.g., a percentage attached to an established cognitive framework but with no source) asserted as if both the framework name and the number are cited. |

**Threshold:**

- **≥ 9 Pass, 0 Fail** → doc is ready.
- **Any Fail** → rewrite, regardless of how many Pass.
- **< 9 Pass** → rewrite.

**Partial counts as half a Pass for the threshold count, and is flagged for revision.**

## 2.3 Inline output shape

Surface the rubric scoring underneath the doc so the human reviewer can sanity-check what you concluded. The shape mirrors the sibling `design-brief` skill's worked example: one line per criterion with a one-clause reason for the score.

---

## Anti-patterns

Constraints documents drift more than any of the sibling supporting docs. These are the patterns to watch for:

1. **Rendering-layer specifics smuggled in.** Sizing rules (minimum type sizes, touch-target dimensions), contrast statements, motion guidelines, copy-pattern specifics (label conventions for the prototype text), perceived-response-time targets — these are how a chosen direction is rendered well, not what filters which directions are worth pursuing. The rubric exists to catch this.
2. **Accessibility-as-floor language that conflates two layers.** "WCAG 2.2 AA is a floor" is a rendering criterion that does not filter the exploration space. The audience-reach version of accessibility ("the audience disproportionately includes users with X disability; directions that fundamentally exclude this audience are non-viable") *is* strategic and belongs here. The same word covers both layers; the rubric tests for which one is meant. See section 1.5 for the positive template.
3. **The cognitive ledger applied at the component level.** Translating a cognitive law into a specific UI pattern (group size limits, alignment rules, salience hierarchy, single-primary-action rules) is rendering guidance. The underlying framework can appear here as a filter; its component-level translation belongs in execution-layer work.
4. **Even well-calibrated exemplars often have this drift.** When using existing constraints docs as exemplars, score them against the rubric in Part 2 yourself rather than copying their content forward. The rubric exists to catch the drift everywhere it appears, including in exemplars.

## Sourcing process (when authoring a constraints doc from scratch)

1. Read the brief and (if it exists) the research doc carefully.
2. Identify the brief's domain and audience. Use the per-domain source map in the sibling `design-brief` skill, or identify domain-authoritative sources directly.
3. For each category in Part 1.2, ask: *does this category apply to this brief? If so, what is the specific filter?* Identify the specific instance — do not enumerate from a generic list.
4. Apply the operational test in the keel to every candidate constraint before writing it down.
5. Draft the doc using the 4–6 paragraph shape in 1.6. Keep it short.
6. **Score against the 11-criterion rubric in 2.2.** Rewrite and re-score until ≥ 9 Pass with 0 Fail.
7. Surface the rubric score alongside the doc.
